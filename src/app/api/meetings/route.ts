import { NextResponse } from 'next/server';
import { extractMeetingInsights } from '@/lib/gemini';
import { dbGetMeetings, dbCreateMeeting, dbGetUserDirectory, dbCreateActionItem, matchAssignee } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { sendMeetingInvitations } from '@/lib/email';
import { rateLimitResponse } from '@/lib/rate-limit';

const MAX_PARTICIPANTS = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ meetings: [], error: 'Not authenticated' }, { status: 401 });
    }

    const meetings = await dbGetMeetings(sessionUser);
    return NextResponse.json({ meetings, source: 'supabase' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch meetings';
    console.error('[Meetings GET]', message);
    return NextResponse.json({ meetings: [], error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // The creator is always the signed-in caller — never trust createdById from the body.
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, meetingType, meetingDate, department, transcript, participants, audioUrl, audioDuration } = body;

    if (!title) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }
    // Every participant receives an email, so validate and cap the list
    const participantList: { name: string; email: string; type: string }[] = Array.isArray(participants) ? participants : [];
    if (participantList.length > MAX_PARTICIPANTS) {
      return NextResponse.json({ error: `A meeting can have at most ${MAX_PARTICIPANTS} participants` }, { status: 400 });
    }
    const badEmail = participantList.find(p => typeof p?.email !== 'string' || !EMAIL_PATTERN.test(p.email.trim()));
    if (badEmail) {
      return NextResponse.json({ error: `Invalid participant email: ${String(badEmail?.email ?? '')}` }, { status: 400 });
    }

    const limited = await rateLimitResponse(transcript ? 'ai' : 'meetingCreate', sessionUser.id);
    if (limited) return limited;

    const directory = await dbGetUserDirectory();

    // Run AI Extraction if transcript exists
    let summary = body.summary || '';
    let actionItemsToCreate: Array<{
      title: string;
      description: string;
      assigneeId?: string;
      assigneeEmail?: string;
      dueDate: string;
      priority: string;
      aiGuidance?: string;
    }> = [];

    if (transcript) {
      try {
        const insights = await extractMeetingInsights(transcript, title);
        summary = summary || insights.summary;

        const participantEmails = participantList.map(p => p.email);
        actionItemsToCreate = insights.actionItems.map(item => {
          const matchedUser = matchAssignee(directory, item.suggestedAssignee, participantEmails);

          return {
            title: item.title,
            description: item.description || '',
            assigneeId: matchedUser?.id || undefined,
            assigneeEmail: matchedUser?.email || undefined,
            dueDate: new Date(item.suggestedDueDate || Date.now() + 86400000 * 5).toISOString(),
            priority: item.suggestedPriority || 'MEDIUM',
            aiGuidance: item.aiGuidance || undefined,
          };
        });
      } catch (aiErr) {
        console.warn('[Meetings POST] AI extraction error:', aiErr);
      }
    }

    // Map participants — try to match user IDs from DB
    const mappedParticipants = participantList.map(p => {
      const email = p.email.trim().toLowerCase();
      const matchedUser = directory.find(u => u.email.toLowerCase() === email);
      return {
        name: (p.name || '').trim() || matchedUser?.name || email.split('@')[0],
        email,
        type: p.type || 'INTERNAL',
        userId: matchedUser?.id || undefined,
      };
    });

    // Create the meeting in Supabase
    const meeting = await dbCreateMeeting({
      title,
      description,
      meetingType: meetingType || 'INTERNAL',
      meetingDate: meetingDate || undefined,
      // Only admins may file a meeting under another department
      department: (sessionUser.role === 'ADMIN' ? department : sessionUser.department) || undefined,
      transcript: transcript || undefined,
      summary,
      audioUrl: audioUrl || undefined,
      audioDuration: audioDuration || undefined,
      createdById: sessionUser.id,
      participants: mappedParticipants,
    });

    // Create extracted action items
    let extractedActionsCount = 0;
    for (const item of actionItemsToCreate) {
      try {
        await dbCreateActionItem({ ...item, meetingId: meeting.id });
        extractedActionsCount++;
      } catch (e) {
        console.warn('[Meetings POST] Failed to create action item:', e);
      }
    }

    const invitations = await sendMeetingInvitations(meeting, sessionUser, req);

    return NextResponse.json({ meeting, extractedActionsCount, invitations }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Meetings POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
