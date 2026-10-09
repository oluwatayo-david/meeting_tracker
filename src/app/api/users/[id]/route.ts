import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase-server';
import { dbCountActiveAdmins, dbGetUsers, dbSetUserActive, dbUpdateUserRole } from '@/lib/supabase-db';
import { isValidDepartment, isValidRole } from '@/lib/departments';

/**
 * PATCH /api/users/[id]   (ADMIN only)
 * Body: { role?, department?, active? }
 * Guardrails: admins can't demote or deactivate themselves, and the last
 * active admin can't be demoted or deactivated.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUser();
    if (!caller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can change roles, departments or account status' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, department, active } = body as { role?: unknown; department?: unknown; active?: unknown };

    if (role === undefined && department === undefined && active === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    if (role !== undefined && !isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (department !== undefined && !isValidDepartment(department)) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
    }
    if (active !== undefined && typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active must be true or false' }, { status: 400 });
    }

    const target = (await dbGetUsers()).find(u => u.id === id);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isSelf = target.id === caller.id;
    const roleChanges = role !== undefined && role !== target.role;
    if (isSelf && roleChanges) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }
    if (isSelf && active === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    // Managers are scoped to a department, so one must be set.
    const nextRole = (role as typeof target.role | undefined) ?? target.role;
    const nextDepartment = (department as string | undefined) ?? target.department;
    if (nextRole === 'MANAGER' && !isValidDepartment(nextDepartment)) {
      return NextResponse.json({ error: 'Choose a department for this manager' }, { status: 400 });
    }

    const losesAdmin = target.role === 'ADMIN' && target.status !== 'DEACTIVATED'
      && ((roleChanges && nextRole !== 'ADMIN') || active === false);
    if (losesAdmin && (await dbCountActiveAdmins()) <= 1) {
      return NextResponse.json({ error: 'This is the last active admin — promote someone else first' }, { status: 400 });
    }

    if (roleChanges || (department !== undefined && department !== target.department)) {
      await dbUpdateUserRole(id, nextRole, nextDepartment);
    }
    if (active !== undefined) {
      await dbSetUserActive(id, active);
    }

    const updated = (await dbGetUsers()).find(u => u.id === id);
    return NextResponse.json({ user: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
