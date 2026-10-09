import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { dbGetUsers, dbInviteUser, dbOnboardUser, dbUpdateUserRole, dbUpsertUser, getServiceClient } from '@/lib/supabase-db';

/**
 * GET /api/users
 * Returns list of all users (ADMIN/MANAGER only via middleware)
 */
export async function GET() {
  try {
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

    // Sync/upsert the current user's own profile (called on login)
    if (action === 'upsert_profile') {
      const { id, name, email, role, department, avatarUrl } = body;
      const updated = await dbUpsertUser({ id, name, email, role, department, avatarUrl });
      return NextResponse.json({ user: updated });
    }

    // Get calling user's role from DB (fallback to auth metadata)
    const adminClient = getServiceClient();
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const callerRole = (callerProfile as Record<string, string>)?.role || (user.user_metadata?.role as string) || 'STAFF';

    if (callerRole !== 'ADMIN' && callerRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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
      return NextResponse.json(result, { status: 201 });
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
      const result = await dbInviteUser(email.trim().toLowerCase(), name.trim(), role, department || '');
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
