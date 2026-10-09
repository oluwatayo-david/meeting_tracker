import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getSessionUser } from '@/lib/supabase-server';
import { dbGetUsers, dbInviteUser, dbOnboardUser, dbUpdateOwnProfile, dbUpdateUserRole, dbUpsertUser, getServiceClient } from '@/lib/supabase-db';
import { rateLimitResponse } from '@/lib/rate-limit';
import { sendEmail, staffWelcomeEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/url';

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
 * Actions: invite, update_role, upsert_profile
 */
export async function POST(req: Request) {
  try {
    // Verify caller is authenticated and is ADMIN or MANAGER
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const adminClient = getServiceClient();
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role, name, department')
      .eq('id', user.id)
      .maybeSingle();
    const profile = callerProfile as Record<string, string> | null;

    // Sync the caller's OWN profile (called on login). The id comes from the
    // session. Role, department and email are never set here — department
    // decides which meetings a user can see, so only admins change it.
    if (action === 'upsert_profile') {
      const { name, avatarUrl } = body;
      if (profile) {
        const updated = await dbUpdateOwnProfile(user.id, { name, avatarUrl });
        return NextResponse.json({ user: updated });
      }
      // First login with no profile row yet: create it as STAFF, using the
      // department chosen at sign-up (stored server-side in auth metadata).
      const created = await dbUpsertUser({
        id: user.id,
        email: user.email || '',
        name,
        role: 'STAFF',
        department: (user.user_metadata?.department as string) || '',
        avatarUrl,
      });
      return NextResponse.json({ user: created });
    }

    const callerRole = profile?.role || 'STAFF';
    const callerName = profile?.name || 'Your administrator';
    const callerDepartment = profile?.department || '';

    if (callerRole !== 'ADMIN' && callerRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (action === 'onboard' || action === 'invite') {
      // Managers may only add staff to their own department
      if (callerRole === 'MANAGER' && body.department && body.department !== callerDepartment) {
        return NextResponse.json({ error: 'Managers can only add staff to their own department' }, { status: 403 });
      }
      if (callerRole === 'MANAGER') body.department = callerDepartment;

      const limited = await rateLimitResponse('provision', user.id);
      if (limited) return limited;
    }

    // Onboard a new staff member (Direct provisioning with credentials)
    if (action === 'onboard') {
      const { email, name, role, department, password } = body;
      if (!email || !name || !role) {
        return NextResponse.json({ error: 'email, name and role are required' }, { status: 400 });
      }
      // MANAGER can only onboard STAFF
      if (callerRole === 'MANAGER' && role !== 'STAFF') {
        return NextResponse.json({ error: 'Managers can only onboard Staff members' }, { status: 403 });
      }
      const result = await dbOnboardUser({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        department: department || '',
        password,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailResult = await sendEmail(staffWelcomeEmail({
        to: normalizedEmail,
        name: name.trim(),
        role,
        department: department || '',
        tempPassword: result.tempPassword!,
        loginUrl: `${getAppUrl(req)}/login?email=${encodeURIComponent(normalizedEmail)}`,
        provisionedByName: callerName,
      }));

      return NextResponse.json({
        ...result,
        emailSent: emailResult.success,
        emailError: emailResult.error,
      }, { status: 201 });
    }

    // Invite a new user via email
    if (action === 'invite') {
      const { email, name, role, department } = body;
      if (!email || !name || !role) {
        return NextResponse.json({ error: 'email, name and role are required' }, { status: 400 });
      }
      // MANAGER can only invite STAFF
      if (callerRole === 'MANAGER' && role !== 'STAFF') {
        return NextResponse.json({ error: 'Managers can only invite Staff members' }, { status: 403 });
      }
      // Pass `req` so dbInviteUser builds a dynamic redirectTo URL (dev vs production)
      const result = await dbInviteUser(email.trim().toLowerCase(), name.trim(), role, department || '', req);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: result.message }, { status: 201 });
    }

    // Update a user's role/department (ADMIN only)
    if (action === 'update_role') {
      if (callerRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Only admins can change user roles' }, { status: 403 });
      }
      const { userId, role, department } = body;
      if (!userId || !role) {
        return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
      }
      const updated = await dbUpdateUserRole(userId, role, department);
      return NextResponse.json({ user: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
