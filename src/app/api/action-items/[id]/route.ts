import { NextResponse } from 'next/server';
import { dbGetActionItemById, dbUpdateActionItem, dbDeleteActionItem } from '@/lib/supabase-db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await dbGetActionItemById(id);
    if (!item) {
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
    const { id } = await params;
    const body = await req.json();

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
    const { id } = await params;
    await dbDeleteActionItem(id);
    return NextResponse.json({ success: true, message: 'Action item deleted successfully' });
  } catch (err: unknown) {
    console.error('[ActionItem DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete action item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
