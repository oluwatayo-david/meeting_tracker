import { NextResponse } from 'next/server';
import { dbGetActionItemById, dbUpdateActionItem, dbDeleteActionItem, dbGetMeetingById } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { ASSIGNEE_SETTABLE_STATUSES, canManageMeeting, canViewActionItem, isAssignee } from '@/lib/authz';
import { ActionItem } from '@/types';

/** Fields other than status that the request would actually change. */
function changedDetailFields(item: ActionItem, body: Record<string, unknown>): string[] {
  const changed: string[] = [];
  const differs = (a: unknown, b: unknown) => (a ?? '') !== (b ?? '');
  if (body.title !== undefined && differs(String(body.title).trim(), item.title.trim())) changed.push('title');
  if (body.description !== undefined && differs(String(body.description).trim(), (item.description || '').trim())) changed.push('description');
  if (body.assigneeId !== undefined && differs(body.assigneeId, item.assigneeId)) changed.push('assignee');
  if (body.assigneeEmail !== undefined && differs(body.assigneeEmail, item.assigneeEmail)) changed.push('assignee');
  if (body.priority !== undefined && differs(body.priority, item.priority)) changed.push('priority');
  if (body.aiGuidance !== undefined && differs(body.aiGuidance, item.aiGuidance)) changed.push('guidance');
  if (body.dueDate !== undefined && String(body.dueDate).slice(0, 10) !== item.dueDate.slice(0, 10)) changed.push('due date');
  return changed;
}

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
    const item = await dbGetActionItemById(id);
    const meeting = item ? await dbGetMeetingById(item.meetingId) : null;
    if (!item || !canViewActionItem(sessionUser, item, meeting || undefined)) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }
    return NextResponse.json({ actionItem: item });
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
    const item = await dbGetActionItemById(id);
    if (!item) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }
    const meeting = await dbGetMeetingById(item.meetingId);
    const body = await req.json();

    if (meeting && canManageMeeting(sessionUser, meeting)) {
      const updated = await dbUpdateActionItem(id, {
        title: body.title,
        description: body.description,
        assigneeId: body.assigneeId,
        assigneeEmail: body.assigneeEmail,
        dueDate: body.dueDate,
        priority: body.priority,
        status: body.status,
        aiGuidance: body.aiGuidance,
      });
      return NextResponse.json({ actionItem: updated });
    }

    if (!isAssignee(sessionUser, item)) {
      return NextResponse.json({ error: 'You do not have permission to edit this action item' }, { status: 403 });
    }

    // Assignees may only move their own item between PENDING and IN_PROGRESS.
    const changed = changedDetailFields(item, body);
    if (changed.length > 0) {
      return NextResponse.json({
        error: `Only your manager can change the ${changed.join(', ')}. You can update the status.`,
      }, { status: 403 });
    }
    if (body.status !== undefined && body.status !== item.status) {
      if (!ASSIGNEE_SETTABLE_STATUSES.includes(body.status) || !ASSIGNEE_SETTABLE_STATUSES.includes(item.status)) {
        return NextResponse.json({
          error: 'Submit proof of work to complete this item — approval is done by your manager.',
        }, { status: 403 });
      }
    }

    const updated = await dbUpdateActionItem(id, { status: body.status });
    return NextResponse.json({ actionItem: updated });
  } catch (err: unknown) {
    console.error('[ActionItem PATCH Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to update action item';
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
    const item = await dbGetActionItemById(id);
    if (!item) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }
    const meeting = await dbGetMeetingById(item.meetingId);
    if (!meeting || !canManageMeeting(sessionUser, meeting)) {
      return NextResponse.json({ error: 'Only the organiser, managers or admins can delete action items' }, { status: 403 });
    }
    await dbDeleteActionItem(id);
    return NextResponse.json({ success: true, message: 'Action item deleted successfully' });
  } catch (err: unknown) {
    console.error('[ActionItem DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete action item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}