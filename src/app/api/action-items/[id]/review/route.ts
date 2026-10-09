import { NextResponse } from 'next/server';
import { dbReviewProof } from '@/lib/supabase-db';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { proofId, status, reviewNotes, reviewerId } = body;

    if (!proofId || !status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid proofId and status (APPROVED or REJECTED) are required' }, { status: 400 });
    }
    if (!reviewerId) {
      return NextResponse.json({ error: 'reviewerId is required' }, { status: 400 });
    }

    // Only MANAGER and ADMIN can review
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      const callerRole = user?.user_metadata?.role || 'STAFF';
      if (callerRole === 'STAFF') {
        return NextResponse.json({ error: 'Only managers or admins can review proof submissions' }, { status: 403 });
      }
    }

    const updatedAction = await dbReviewProof(id, proofId, status, reviewNotes || '', reviewerId);

    if (!updatedAction) {
      return NextResponse.json({ error: 'Action item or proof not found' }, { status: 404 });
    }

    return NextResponse.json({
      actionItem: updatedAction,
      message: status === 'APPROVED'
        ? 'Proof of work approved successfully'
        : 'Revision requested and feedback noted',
    });
  } catch (err: unknown) {
    console.error('[Review POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
