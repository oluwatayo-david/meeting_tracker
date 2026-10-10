/**
 * rate-limit.ts
 * -------------------------------------------------------
 * Fixed-window rate limiting backed by the check_rate_limit() SQL function
 * (supabase-hardening.sql), so limits hold across all server instances.
 *
 * Fails OPEN if the database function is unavailable: rate limiting protects
 * cost and inboxes, not access — access control lives in authz.ts.
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-db';

export const LIMITS = {
  /** Gemini calls: transcription, extraction, co-pilot */
  ai: { limit: 20, windowSeconds: 10 * 60 },
  /** Creating meetings (each one can send invitation emails) */
  meetingCreate: { limit: 20, windowSeconds: 60 * 60 },
  /** Provisioning / inviting staff (sends credential emails) */
  provision: { limit: 30, windowSeconds: 60 * 60 },
  /** Reminder emails, per sender */
  reminder: { limit: 30, windowSeconds: 60 * 60 },
  /** Reminder emails for one action item (stops inbox spamming) */
  reminderPerItem: { limit: 3, windowSeconds: 24 * 60 * 60 },
  /** PowerPoint exports */
  export: { limit: 30, windowSeconds: 10 * 60 },
  /** Password changes */
  passwordChange: { limit: 5, windowSeconds: 15 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

export async function checkRateLimit(name: LimitName, subject: string): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  const { data, error } = await getServiceClient().rpc('check_rate_limit', {
    p_key: `${name}:${subject}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('[RateLimit] check failed (is supabase-hardening.sql applied?):', error.message);
    return true;
  }
  return data === true;
}

/** Returns a 429 response when over the limit, otherwise null. */
export async function rateLimitResponse(name: LimitName, subject: string): Promise<NextResponse | null> {
  if (await checkRateLimit(name, subject)) return null;
  const minutes = Math.ceil(LIMITS[name].windowSeconds / 60);
  return NextResponse.json(
    { error: `Too many requests. Please wait and try again (limit resets within ${minutes} minutes).` },
    { status: 429, headers: { 'Retry-After': String(LIMITS[name].windowSeconds) } }
  );
}