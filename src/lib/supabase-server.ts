import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null; // Callers treat this as "not authenticated"
  }

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — ignore
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  department: string;
}

/**
 * Resolves the signed-in caller from the session cookie. The role comes from
 * the users table (never from user_metadata, which the user can edit).
 * Returns null when there is no valid session.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await createServiceRoleClient();
  const { data: profile } = await admin
    .from('users')
    .select('name, email, role, department')
    .eq('id', user.id)
    .maybeSingle();

  const row = (profile || {}) as Record<string, string | null>;
  return {
    id: user.id,
    email: row.email || user.email || '',
    name: row.name || user.email?.split('@')[0] || 'A colleague',
    role: (row.role as SessionUser['role']) || 'STAFF',
    department: row.department || '',
  };
}

export async function createServiceRoleClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

