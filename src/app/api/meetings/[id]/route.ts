import { NextResponse } from 'next/server';
import { dbGetMeetingById, dbUpdateMeeting, dbDeleteMeeting } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { sendMeetingInvitations } from '@/lib/email';
import { canManageMeeting as canManage, canViewMeeting as canView } from '@/lib/authz';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { id } = await params;
    const meeting = await dbGetMeetingById(id);
    if (!meeting || !canView(sessionUser, meeting)) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json({ meeting });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { id } = await params;
    const existing = await dbGetMeetingById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    if (!canManage(sessionUser, existing)) {
      return NextResponse.json({ error: 'Only the organiser, managers or admins can edit this meeting' }, { status: 403 });
    }

    const body = await req.json();

    const updated = await dbUpdateMeeting(id, {
      title: body.title,
      description: body.description,
      meetingType: body.meetingType,
      meetingDate: body.meetingDate,
      transcript: body.transcript,
      summary: body.summary,
      audioUrl: body.audioUrl,
      audioDuration: body.audioDuration,
      // Moving a meeting between departments changes who can see it — admins only
      department: sessionUser.role === 'ADMIN' ? body.department : undefined,
      participants: body.participants,
    });

    // Invite only people who were not already on the meeting
    let invitations: { sent: number; failed: string[] } | undefined;
    if (Array.isArray(body.participants)) {
      const previous = new Set(existing.participants.map(p => p.email.toLowerCase()));
      const added = updated.participants
        .map(p => p.email.toLowerCase())
        .filter(email => !previous.has(email));
      if (added.length > 0) {
        invitations = await sendMeetingInvitations(updated, sessionUser, req, added);
      }
    }

    return NextResponse.json({ meeting: updated, invitations });
  } catch (err: unknown) {
    console.error('[Meeting PATCH Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to update meeting';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { id } = await params;
    const existing = await dbGetMeetingById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    if (!canManage(sessionUser, existing)) {
      return NextResponse.json({ error: 'Only the organiser, managers or admins can delete this meeting' }, { status: 403 });
    }
    await dbDeleteMeeting(id);
    return NextResponse.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (err: unknown) {
    console.error('[Meeting DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete meeting';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}