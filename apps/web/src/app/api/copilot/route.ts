import { NextResponse } from 'next/server';
import { generateActionCoPilotAdvice, refineActionPoint } from '@/lib/gemini';
import { dbUpdateActionItemAiGuidance, dbGetActionItemById, dbGetMeetingById } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { canViewActionItem } from '@/lib/authz';
import { rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const limited = await rateLimitResponse('ai', sessionUser.id);
    if (limited) return limited;

    const { actionItemId, title, description, mode } = await req.json();

    // Saving guidance onto an item requires access to that item
    let canPersist = false;
    if (actionItemId) {
      const item = await dbGetActionItemById(actionItemId);
      const meeting = item ? await dbGetMeetingById(item.meetingId) : null;
      canPersist = !!item && canViewActionItem(sessionUser, item, meeting || undefined);
    }

    if (!title) {
      return NextResponse.json({ error: 'Action item title is required' }, { status: 400 });
    }

    let advice: string;

    if (mode === 'refine') {
      // Deep refinement: rewrite, improve clarity, add KPIs and risks
      advice = await refineActionPoint(title, description || '');
    } else {
      // Standard co-pilot guidance
      advice = await generateActionCoPilotAdvice(title, description || '');
    }

    // If actionItemId provided, update the item in DB
    if (actionItemId && canPersist) {
      try {
        await dbUpdateActionItemAiGuidance(actionItemId, advice);
      } catch (dbErr) {
        console.warn('Could not persist AI guidance to DB for item:', actionItemId, dbErr);
      }
    }

    return NextResponse.json({ advice });
  } catch (err: unknown) {
    console.error('Error generating AI advice:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
