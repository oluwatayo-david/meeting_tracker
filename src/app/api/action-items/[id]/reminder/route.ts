import { NextResponse } from 'next/server';
import { dbUpdateActionItemReminder, dbGetActionItems } from '@/lib/supabase-db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await dbUpdateActionItemReminder(id);

    // Fetch updated item
    const items = await dbGetActionItems({ assigneeId: undefined });
    const updatedAction = items.find(a => a.id === id);

    if (!updatedAction) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    return NextResponse.json({
      actionItem: updatedAction,
      message: `Deadline reminder dispatched to ${updatedAction.assigneeEmail || 'assignee'}.`,
    });
  } catch (err: unknown) {
    console.error('[Reminder POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
