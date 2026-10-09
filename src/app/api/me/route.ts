import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { dbGetUserById, dbUpsertUser } from '@/lib/supabase-db';

/**
 * GET /api/me
 * The signed-in user's profile, read with the service role so the UI always
 * shows the same role the API enforces (public.users is the source of truth,
 * never user_metadata). Creates the profile row as STAFF on first login.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const existing = await dbGetUserById(user.id);
    if (existing) return NextResponse.json({ user: existing });

    const meta = user.user_metadata || {};
    const created = await dbUpsertUser({
      id: user.id,
      email: user.email || '',
      name: (meta.full_name as string) || (meta.name as string) || user.email?.split('@')[0],
      role: 'STAFF',
      department: (meta.department as string) || '',
      avatarUrl: (meta.avatar_url as string) || undefined,
    });
    return NextResponse.json({ user: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
