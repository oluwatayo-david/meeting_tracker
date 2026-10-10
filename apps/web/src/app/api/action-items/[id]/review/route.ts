import { NextResponse } from 'next/server';
import { dbGetActionItemById, dbGetMeetingById, dbReviewProof } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { canManageMeeting } from '@/lib/authz';

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
    const { proofId, status, reviewNotes } = body;

    if (!proofId || !status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid proofId and status (APPROVED or REJECTED) are required' }, { status: 400 });
    }

    const item = await dbGetActionItemById(id);
    if (!item) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }
    const meeting = await dbGetMeetingById(item.meetingId);
    if (sessionUser.role === 'STAFF' || !meeting || !canManageMeeting(sessionUser, meeting)) {
      return NextResponse.json({ error: 'Only managers of this department or admins can review this submission' }, { status: 403 });
    }

    // The proof must belong to this action item (prevents approving item A with proof from item B)
    const proof = item.proofSubmissions.find(p => p.id === proofId);
    if (!proof) {
      return NextResponse.json({ error: 'Proof submission not found for this action item' }, { status: 404 });
    }
    if (proof.submittedById === sessionUser.id && sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'You cannot review your own submission' }, { status: 403 });
    }
    if (proof.status !== 'PENDING') {
      return NextResponse.json({ error: 'This submission has already been reviewed' }, { status: 400 });
    }

    const updatedAction = await dbReviewProof(id, proofId, status, reviewNotes || '', sessionUser.id);

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