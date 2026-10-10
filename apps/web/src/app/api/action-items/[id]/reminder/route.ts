import { NextResponse } from 'next/server';
import { dbUpdateActionItemReminder, dbGetActionItemById, dbGetMeetingById } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { canManageMeeting } from '@/lib/authz';
import { actionReminderEmail, sendEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/url';
import { rateLimitResponse } from '@/lib/rate-limit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const item = await dbGetActionItemById(id);
    if (!item) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }
    const meeting = await dbGetMeetingById(item.meetingId);
    if (!meeting || !canManageMeeting(sessionUser, meeting)) {
      return NextResponse.json({ error: 'Only the organiser, managers or admins can send reminders' }, { status: 403 });
    }
    if (!item.assigneeEmail) {
      return NextResponse.json({ error: 'This action item has no assignee to remind' }, { status: 400 });
    }
    if (item.status === 'APPROVED') {
      return NextResponse.json({ error: 'This action item is already approved' }, { status: 400 });
    }

    const limited = await rateLimitResponse('reminder', sessionUser.id)
      || await rateLimitResponse('reminderPerItem', id);
    if (limited) return limited;

    const result = await sendEmail(actionReminderEmail({
      to: item.assigneeEmail,
      recipientName: item.assigneeName || item.assigneeEmail.split('@')[0],
      senderName: sessionUser.name,
      itemTitle: item.title,
      meetingTitle: item.meetingTitle,
      dueDate: item.dueDate,
      priority: item.priority,
      status: item.status,
      appUrl: getAppUrl(req),
    }));
    if (!result.success) {
      return NextResponse.json({ error: `Reminder could not be sent: ${result.error}` }, { status: 502 });
    }

    await dbUpdateActionItemReminder(id);
    const updatedAction = await dbGetActionItemById(id);

    return NextResponse.json({
      actionItem: updatedAction,
      message: `Deadline reminder emailed to ${item.assigneeEmail}.`,
    });
  } catch (err: unknown) {
    console.error('[Reminder POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}