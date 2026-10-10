import { NextResponse } from 'next/server';
import { dbGetActionItems, dbCreateActionItem, dbGetMeetingById } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { canManageMeeting } from '@/lib/authz';

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ actionItems: [], error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;
    const meetingId = searchParams.get('meetingId') || undefined;

    // Visibility is applied in the database query (assigned to me + meetings I manage)
    const actionItems = await dbGetActionItems({ status, assigneeId, meetingId, viewer: sessionUser });

    return NextResponse.json({ actionItems, source: 'supabase' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch action items';
    console.error('[Action Items GET]', message);
    return NextResponse.json({ actionItems: [], error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { meetingId, title, description, assigneeId, assigneeEmail, dueDate, priority, aiGuidance } = body;

    if (!title || !dueDate || !meetingId) {
      return NextResponse.json({ error: 'meetingId, title and due date are required' }, { status: 400 });
    }

    const meeting = await dbGetMeetingById(meetingId);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    if (!canManageMeeting(sessionUser, meeting)) {
      return NextResponse.json({ error: 'Only the organiser, managers or admins can add action items to this meeting' }, { status: 403 });
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