import { NextResponse } from 'next/server';
import { dbSubmitProof } from '@/lib/supabase-db';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { submittedById, notes, fileName, fileUrl, fileType } = body;

    if (!submittedById) {
      return NextResponse.json({ error: 'submittedById is required' }, { status: 400 });
    }

    if (!notes && !fileUrl) {
      return NextResponse.json({ error: 'Please provide either notes or a file deliverable' }, { status: 400 });
    }

    // Verify caller is the assignee (or MANAGER/ADMIN who submitted on behalf)
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      const callerRole = user?.user_metadata?.role || 'STAFF';
      // STAFF can only submit for themselves
      if (callerRole === 'STAFF' && user?.id !== submittedById) {
        return NextResponse.json({ error: 'You can only submit proof for your own action items' }, { status: 403 });
      }
    }

    const updatedAction = await dbSubmitProof(id, {
      submittedById,
      notes: notes || 'Submitted deliverables for manager approval.',
      fileName: fileName || undefined,
      fileUrl: fileUrl || undefined,
      fileType: fileType || undefined,
    });

    if (!updatedAction) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    return NextResponse.json({ actionItem: updatedAction, message: 'Proof submitted successfully' });
  } catch (err: unknown) {
    console.error('[Proof POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
