import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/data/mode
 * Returns minimal workspace status — no mock data, no analytics visible to users.
 */
export async function GET() {
  let supabaseConnected = false;

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('meetings').select('id').limit(1);
      supabaseConnected = !error;
    }
  } catch {
    // Ignore
  }

  return NextResponse.json({
    hasMockData: false,
    isRealMode: true,
    supabaseConnected,
  });
}
