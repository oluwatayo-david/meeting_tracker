import { NextResponse } from 'next/server';
import { dbGetActionItems, dbCreateActionItem } from '@/lib/supabase-db';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;
    const meetingId = searchParams.get('meetingId') || undefined;

    // Get caller identity for RBAC
    const supabase = await createServerSupabaseClient();
    let userId: string | undefined;
    let userRole: string | undefined;

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userRole = user.user_metadata?.role || 'STAFF';
      }
    }

    const actionItems = await dbGetActionItems({ status, assigneeId, meetingId, userId, role: userRole });
    return NextResponse.json({ actionItems, source: 'supabase' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch action items';
    console.error('[Action Items GET]', message);
    return NextResponse.json({ actionItems: [], error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingId, title, description, assigneeId, assigneeEmail, dueDate, priority, aiGuidance } = body;

    if (!title || !dueDate || !meetingId) {
      return NextResponse.json({ error: 'meetingId, title and due date are required' }, { status: 400 });
    }

    const actionItem = await dbCreateActionItem({
      meetingId,
      title,
      description: description || '',
      assigneeId: assigneeId || undefined,
      assigneeEmail: assigneeEmail || undefined,
      dueDate: new Date(dueDate).toISOString(),
      priority: priority || 'MEDIUM',
      aiGuidance: aiGuidance || undefined,
    });

    return NextResponse.json({ actionItem }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Action Items POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
