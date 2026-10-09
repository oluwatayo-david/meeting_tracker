import { NextResponse } from 'next/server';
import { extractMeetingInsights } from '@/lib/gemini';
import { dbGetMeetings, dbCreateMeeting, dbGetUsers, dbCreateActionItem } from '@/lib/supabase-db';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    let userId: string | undefined;
    let userRole: string | undefined;

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userRole = user.user_metadata?.role || 'STAFF';
      }
    }

    const meetings = await dbGetMeetings(userId, userRole);
    return NextResponse.json({ meetings, source: 'supabase' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch meetings';
    console.error('[Meetings GET]', message);
    return NextResponse.json({ meetings: [], error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, meetingType, transcript, participants, audioUrl, audioDuration, createdById, createdByName } = body;

    if (!title) {
      return NextResponse.json({ error: 'Meeting title is required' }, { status: 400 });
    }
    if (!createdById) {
      return NextResponse.json({ error: 'createdById is required' }, { status: 400 });
    }

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

        // Fetch real users from DB for matching
        const dbUsers = await dbGetUsers();

        actionItemsToCreate = insights.actionItems.map(item => {
          const matchedUser = dbUsers.find(u =>
            u.name.toLowerCase().includes(item.suggestedAssignee.toLowerCase()) ||
            item.suggestedAssignee.toLowerCase().includes(u.name.toLowerCase().split(' ')[0])
          );

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
    const dbUsers = await dbGetUsers();
    const mappedParticipants = (participants || []).map((p: { name: string; email: string; type: string }) => {
      const matchedUser = dbUsers.find(u => u.email.toLowerCase() === p.email.toLowerCase());
      return {
        name: p.name,
        email: p.email,
        type: p.type || 'INTERNAL',
        userId: matchedUser?.id || undefined,
      };
    });

    // Create the meeting in Supabase
    const meeting = await dbCreateMeeting({
      title,
      description,
      meetingType: meetingType || 'INTERNAL',
      transcript: transcript || undefined,
      summary,
      audioUrl: audioUrl || undefined,
      audioDuration: audioDuration || undefined,
      createdById,
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

    return NextResponse.json({ meeting, extractedActionsCount }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Meetings POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
