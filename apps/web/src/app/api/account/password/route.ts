import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { dbCompletePasswordChange } from '@/lib/supabase-db';
import { rateLimitResponse } from '@/lib/rate-limit';

const MIN_LENGTH = 10;

/**
 * POST /api/account/password
 * Sets a new password for the signed-in user and clears the
 * must_change_password flag set when an admin provisioned / invited them.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const limited = await rateLimitResponse('passwordChange', user.id);
    if (limited) return limited;

    const { newPassword } = await req.json();
    if (typeof newPassword !== 'string' || newPassword.length < MIN_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_LENGTH} characters` }, { status: 400 });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: 'Password must contain both letters and numbers' }, { status: 400 });
    }
    if (user.email && newPassword.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) {
      return NextResponse.json({ error: 'Password must not contain your email name' }, { status: 400 });
    }

    await dbCompletePasswordChange(user.id, newPassword);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Password POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to update password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}