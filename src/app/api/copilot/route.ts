import { NextResponse } from 'next/server';
import { generateActionCoPilotAdvice, refineActionPoint } from '@/lib/gemini';
import { dbUpdateActionItemAiGuidance } from '@/lib/supabase-db';

export async function POST(req: Request) {
  try {
    const { actionItemId, title, description, mode } = await req.json();

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
    if (actionItemId) {
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
