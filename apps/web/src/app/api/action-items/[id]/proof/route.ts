import { NextResponse } from 'next/server';
import { dbGetActionItemById, dbSubmitProof } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { isAssignee } from '@/lib/authz';

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
    const body = await req.json();
    const { notes, fileName, fileUrl, fileType } = body;

    if (!notes && !fileUrl) {
      return NextResponse.json({ error: 'Please provide either notes or a file deliverable' }, { status: 400 });
    }
    if (fileUrl && !/^https?:\/\//i.test(fileUrl)) {
      return NextResponse.json({ error: 'File link must start with http:// or https://' }, { status: 400 });
    }

    const item = await dbGetActionItemById(id);
    if (!item) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }
    // Proof is always submitted as the signed-in user, and only by the assignee
    if (!isAssignee(sessionUser, item)) {
      return NextResponse.json({ error: 'You can only submit proof for your own action items' }, { status: 403 });
    }
    if (item.status === 'APPROVED') {
      return NextResponse.json({ error: 'This action item has already been approved' }, { status: 400 });
    }

    const updatedAction = await dbSubmitProof(id, {
      submittedById: sessionUser.id,
      notes: notes || 'Submitted deliverables for manager approval.',
      fileName: fileName || undefined,
      fileUrl: fileUrl || undefined,
      fileType: fileType || undefined,
    });

    return NextResponse.json({ actionItem: updatedAction, message: 'Proof submitted successfully' });
  } catch (err: unknown) {
    console.error('[Proof POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}