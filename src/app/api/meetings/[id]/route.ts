import { NextResponse } from 'next/server';
import { dbGetMeetingById, dbUpdateMeeting, dbDeleteMeeting } from '@/lib/supabase-db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = await dbGetMeetingById(id);
    if (!meeting) {
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
    const { id } = await params;
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
      department: body.department,
      participants: body.participants,
    });

    return NextResponse.json({ meeting: updated });
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
    const { id } = await params;
    await dbDeleteMeeting(id);
    return NextResponse.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (err: unknown) {
    console.error('[Meeting DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete meeting';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
