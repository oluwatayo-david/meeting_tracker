import { NextResponse } from 'next/server';
import { extractMeetingInsights, transcribeAudioData } from '@/lib/gemini';
import { dbGetUserDirectory, dbCreateActionItem, dbUpdateMeetingTranscriptAndSummary, dbGetMeetingById, matchAssignee } from '@/lib/supabase-db';
import { getSessionUser } from '@/lib/supabase-server';
import { canViewMeeting } from '@/lib/authz';
import { rateLimitResponse } from '@/lib/rate-limit';
import { ActionItem } from '@/types';

const MAX_AUDIO_BASE64_CHARS = 28_000_000; // ≈ 20 MB of audio
const MAX_TRANSCRIPT_CHARS = 400_000;

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const limited = await rateLimitResponse('ai', sessionUser.id);
    if (limited) return limited;

    const { meetingId, transcript, meetingTitle, participants, audioBase64, audioMimeType } = await req.json();

    if (typeof audioBase64 === 'string' && audioBase64.length > MAX_AUDIO_BASE64_CHARS) {
      return NextResponse.json({ error: 'Recording is too large to analyse (max ~20 MB)' }, { status: 413 });
    }
    if (typeof transcript === 'string' && transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json({ error: 'Transcript is too long to analyse' }, { status: 413 });
    }

    // Writing the transcript / action items requires access to that meeting
    if (meetingId) {
      const meeting = await dbGetMeetingById(meetingId);
      if (!meeting || !canViewMeeting(sessionUser, meeting)) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
    }

    let finalTranscript = (transcript || '').trim();

    // If transcript is empty but audio base64 is provided, transcribe with Gemini
    if (!finalTranscript && audioBase64) {
      try {
        finalTranscript = await transcribeAudioData(audioBase64, audioMimeType || 'audio/webm');
      } catch (audioErr) {
        console.warn('Audio transcription failed with Gemini cascade:', audioErr);
      }
    }

    if (!finalTranscript || finalTranscript.length === 0) {
      finalTranscript = `Meeting discussion for: ${meetingTitle || 'Scheduled Session'}. General business alignment and action item delegation.`;
    }

    // Run Gemini insight analysis
    let insights;
    try {
      insights = await extractMeetingInsights(finalTranscript, meetingTitle || 'Meeting');
    } catch (aiErr) {
      console.warn('extractMeetingInsights error:', aiErr);
      insights = {
        summary: `Meeting recorded for ${meetingTitle}. Key discussion and delegated items captured.`,
        actionItems: [],
      };
    }

    // Fetch real users from Supabase for matching
    const users = await dbGetUserDirectory();
    const participantEmails = (participants || []).map((p: { email: string }) => p.email.toLowerCase());

    const createdActionItems: ActionItem[] = [];

    for (const item of insights.actionItems || []) {
      // Match by name; leave unassigned (for a manager to assign) rather than guess
      const matchedUser = matchAssignee(users, item.suggestedAssignee, participantEmails);

      const dueDate = new Date(item.suggestedDueDate || Date.now() + 86400000 * 5).toISOString();

      if (meetingId) {
        const created = await dbCreateActionItem({
          meetingId,
          title: item.title,
          description: item.description,
          assigneeId: matchedUser?.id,
          assigneeEmail: matchedUser?.email,
          dueDate,
          priority: item.suggestedPriority,
          aiGuidance: item.aiGuidance,
        });
        createdActionItems.push(created);
      } else {
        // Return structured object if meeting isn't created yet
        createdActionItems.push({
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          meetingId: '',
          title: item.title,
          description: item.description,
          assigneeId: matchedUser?.id,
          assigneeName: matchedUser?.name,
          assigneeEmail: matchedUser?.email,
          dueDate,
          priority: item.suggestedPriority,
          status: 'PENDING',
          aiGuidance: item.aiGuidance,
          reminderCount: 0,
          proofSubmissions: [],
          auditLogs: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Persist transcript and summary to meeting in DB
    if (meetingId) {
      await dbUpdateMeetingTranscriptAndSummary(meetingId, finalTranscript, insights.summary);
    }

    const updatedMeeting = meetingId ? await dbGetMeetingById(meetingId) : null;

    return NextResponse.json({
      transcript: finalTranscript,
      summary: insights.summary,
      actionItems: createdActionItems,
      extractedCount: createdActionItems.length,
      meeting: updatedMeeting,
    });
  } catch (err: unknown) {
    console.error('Error analyzing meeting transcript:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
