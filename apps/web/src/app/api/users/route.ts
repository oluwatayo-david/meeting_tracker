import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase-server';
import { dbGetUsers, dbInviteUser, dbOnboardUser } from '@/lib/supabase-db';
import { rateLimitResponse } from '@/lib/rate-limit';
import { sendEmail, staffWelcomeEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/url';
import { isValidDepartment, isValidRole } from '@/lib/departments';

/**
 * GET /api/users
 * Returns the user directory (any signed-in user — needed to pick meeting attendees)
 */
export async function GET() {
  try {
    if (!(await getSessionUser())) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const users = await dbGetUsers();
    return NextResponse.json({ users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Actions: onboard (create account with a temporary password), invite (email invite).
 * Role / department / active changes go through PATCH /api/users/[id].
 */
export async function POST(req: Request) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (caller.role !== 'ADMIN' && caller.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    if (action !== 'onboard' && action !== 'invite') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const role = body.role;
    if (!email || !name || !role) {
      return NextResponse.json({ error: 'email, name and role are required' }, { status: 400 });
    }
    // Admins are promoted from an existing account, never created directly.
    if (!isValidRole(role) || role === 'ADMIN') {
      return NextResponse.json({ error: 'Role must be STAFF or MANAGER' }, { status: 400 });
    }

    // Managers may only add staff to their own department
    let department: string = body.department;
    if (caller.role === 'MANAGER') {
      if (role !== 'STAFF') {
        return NextResponse.json({ error: 'Managers can only add Staff members' }, { status: 403 });
      }
      if (department && department !== caller.department) {
        return NextResponse.json({ error: 'Managers can only add staff to their own department' }, { status: 403 });
      }
      department = caller.department;
    }
    if (!isValidDepartment(department)) {
      return NextResponse.json({ error: 'A valid department is required' }, { status: 400 });
    }

    const limited = await rateLimitResponse('provision', caller.id);
    if (limited) return limited;

    // Onboard a new team member (direct provisioning with credentials)
    if (action === 'onboard') {
      const result = await dbOnboardUser({ email, name, role, department, password: body.password });
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      const emailResult = await sendEmail(staffWelcomeEmail({
        to: email,
        name,
        role,
        department,
        tempPassword: result.tempPassword!,
        loginUrl: `${getAppUrl(req)}/login?email=${encodeURIComponent(email)}`,
        provisionedByName: caller.name,
      }));

      return NextResponse.json({
        ...result,
        emailSent: emailResult.success,
        emailError: emailResult.error,
      }, { status: 201 });
    }

    // Invite a new user via email
    // Pass `req` so dbInviteUser builds a dynamic redirectTo URL (dev vs production)
    const result = await dbInviteUser(email, name, role, department, req);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: result.message }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
