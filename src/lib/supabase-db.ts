/**
 * supabase-db.ts
 * -------------------------------------------------------
 * Centralised Supabase data-access layer.
 * All API routes call these helpers.
 * Handles snake_case ↔ camelCase mapping and joins in-memory
 * to prevent PostgREST schema-cache relationship errors.
 */

import { createClient } from '@supabase/supabase-js';
import {
  User,
  Meeting,
  ActionItem,
  ProofSubmission,
  MeetingParticipant,
} from '@/types';

// Service-role client for server-side API routes (bypasses RLS)
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Mappers ────────────────────────────────────────────────────────────────

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: (row.name as string) || (row.email as string)?.split('@')[0] || 'User',
    email: (row.email as string) || '',
    role: (row.role as User['role']) || 'STAFF',
    department: (row.department as string) || '',
    avatarUrl: (row.avatar_url as string) || undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapProofSubmission(
  row: Record<string, unknown>,
  usersMap?: Map<string, User>
): ProofSubmission {
  const submitterId = row.submitted_by_id as string;
  const reviewerId = row.reviewed_by_id as string;
  const submitter = usersMap?.get(submitterId);
  const reviewer = reviewerId ? usersMap?.get(reviewerId) : undefined;

  return {
    id: row.id as string,
    actionItemId: row.action_item_id as string,
    submittedById: submitterId,
    submittedByName: submitter?.name || (row.submitted_by_name as string) || 'Assignee',
    notes: (row.notes as string) || '',
    fileUrl: (row.file_url as string) || undefined,
    fileName: (row.file_name as string) || undefined,
    fileType: (row.file_type as string) || undefined,
    status: (row.status as ProofSubmission['status']) || 'PENDING',
    reviewNotes: (row.review_notes as string) || undefined,
    reviewedById: reviewerId || undefined,
    reviewedByName: reviewer?.name || (row.reviewed_by_name as string) || undefined,
    reviewedAt: (row.reviewed_at as string) || undefined,
    submittedAt: (row.submitted_at as string) || new Date().toISOString(),
  };
}

export function mapParticipant(row: Record<string, unknown>): MeetingParticipant {
  return {
    id: row.id as string,
    meetingId: row.meeting_id as string,
    userId: (row.user_id as string) || undefined,
    email: row.email as string,
    name: row.name as string,
    type: (row.type as MeetingParticipant['type']) || 'INTERNAL',
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapActionItem(
  row: Record<string, unknown>,
  meetingsMap?: Map<string, string>,
  usersMap?: Map<string, User>,
  proofsMap?: Map<string, ProofSubmission[]>
): ActionItem {
  const id = row.id as string;
  const meetingId = row.meeting_id as string;
  const assigneeId = (row.assignee_id as string) || undefined;
  const assignee = assigneeId ? usersMap?.get(assigneeId) : undefined;
  const meetingTitle = meetingsMap?.get(meetingId) || (row.meeting_title as string) || '';
  const proofs = proofsMap?.get(id) || [];

  return {
    id,
    meetingId,
    meetingTitle,
    title: row.title as string,
    description: (row.description as string) || '',
    assigneeId,
    assigneeName: assignee?.name || (row.assignee_name as string) || undefined,
    assigneeEmail: assignee?.email || (row.assignee_email as string) || undefined,
    dueDate: (row.due_date as string) || new Date().toISOString(),
    priority: (row.priority as ActionItem['priority']) || 'MEDIUM',
    status: (row.status as ActionItem['status']) || 'PENDING',
    aiGuidance: (row.ai_guidance as string) || undefined,
    reminderCount: (row.reminder_count as number) || 0,
    lastReminderSentAt: (row.last_reminder_sent_at as string) || undefined,
    proofSubmissions: proofs,
    auditLogs: [],
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function dbGetUsers(): Promise<User[]> {
  const supabase = getServiceClient();
  
  const [{ data, error }, authResult] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: false }),
    supabase.auth.admin.listUsers().catch(() => ({ data: { users: [] } })),
  ]);

  if (error) {
    console.error('dbGetUsers error:', error);
    return [];
  }

  const authUsersMap = new Map<string, { lastSignIn?: string | null; confirmedAt?: string | null; invitedAt?: string | null }>();
  for (const au of authResult.data?.users || []) {
    authUsersMap.set(au.id, {
      lastSignIn: au.last_sign_in_at,
      confirmedAt: au.confirmed_at,
      invitedAt: au.invited_at,
    });
  }

  return (data || []).map(row => {
    const u = mapUser(row as Record<string, unknown>);
    const au = authUsersMap.get(u.id);
    if (au) {
      const isPending = !au.lastSignIn && (Boolean(au.invitedAt) || !au.confirmedAt);
      u.status = isPending ? 'PENDING' : 'ACTIVE';
      u.invitedAt = au.invitedAt || undefined;
    } else {
      u.status = 'ACTIVE';
    }
    return u;
  });
}

export async function dbGetUserById(id: string): Promise<User | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return mapUser(data as Record<string, unknown>);
}

export async function dbUpsertUser(user: Partial<User> & { id: string; email: string }): Promise<User> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      role: user.role || 'STAFF',
      department: user.department || null,
      avatar_url: user.avatarUrl || null,
    }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapUser(data as Record<string, unknown>);
}

export async function dbOnboardUser(params: {
  email: string;
  name: string;
  role: User['role'];
  department: string;
  password?: string;
}): Promise<{ success: boolean; user?: User; tempPassword?: string; message: string }> {
  const supabase = getServiceClient();
  const password = params.password || `Pass@${Math.floor(100000 + Math.random() * 900000)}`;

  // Direct user provisioning via Supabase Auth Admin API
  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: params.name,
      name: params.name,
      role: params.role,
      department: params.department,
    },
  });

  if (error) {
    if (error.message.includes('already') || error.message.includes('exists')) {
      return { success: false, message: `A user with email ${params.email} already exists.` };
    }
    return { success: false, message: error.message };
  }

  if (data?.user) {
    const userProfile = await dbUpsertUser({
      id: data.user.id,
      name: params.name,
      email: params.email,
      role: params.role,
      department: params.department,
    });

    return {
      success: true,
      user: userProfile,
      tempPassword: password,
      message: `User ${params.name} provisioned successfully.`,
    };
  }

  return { success: false, message: 'Failed to create user account' };
}

export async function dbInviteUser(
  email: string,
  name: string,
  role: User['role'],
  department: string
): Promise<{ success: boolean; message: string }> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name, role, department },
  });
  if (error) return { success: false, message: error.message };

  if (data?.user) {
    await supabase.from('users').upsert({
      id: data.user.id,
      name,
      email,
      role,
      department,
    }, { onConflict: 'id' });
  }

  return { success: true, message: `Invitation sent to ${email}` };
}

export async function dbUpdateUserRole(
  userId: string,
  role: User['role'],
  department?: string
): Promise<User> {
  const supabase = getServiceClient();
  const updatePayload: Record<string, unknown> = { role };
  if (department) updatePayload.department = department;
  const { data, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role, department },
  });

  return mapUser(data as Record<string, unknown>);
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export async function dbGetMeetings(userId?: string, role?: string): Promise<Meeting[]> {
  const supabase = getServiceClient();

  // 1. Fetch meetings, participants, action items, proofs, and users in parallel
  const [meetingsRes, participantsRes, actionsRes, proofsRes, users] = await Promise.all([
    supabase.from('meetings').select('*').order('created_at', { ascending: false }),
    supabase.from('meeting_participants').select('*'),
    supabase.from('action_items').select('*').order('created_at', { ascending: false }),
    supabase.from('proof_submissions').select('*').order('submitted_at', { ascending: false }),
    dbGetUsers(),
  ]);

  if (meetingsRes.error) {
    console.error('dbGetMeetings error:', meetingsRes.error);
    throw new Error(meetingsRes.error.message);
  }

  const usersMap = new Map<string, User>(users.map(u => [u.id, u]));

  // Build proofs map by actionItemId
  const proofsMap = new Map<string, ProofSubmission[]>();
  for (const pRow of proofsRes.data || []) {
    const p = mapProofSubmission(pRow as Record<string, unknown>, usersMap);
    const existing = proofsMap.get(p.actionItemId) || [];
    existing.push(p);
    proofsMap.set(p.actionItemId, existing);
  }

  // Build meetings map for action items
  const rawMeetings = (meetingsRes.data || []) as Record<string, unknown>[];
  const meetingsMap = new Map<string, string>(rawMeetings.map(m => [m.id as string, m.title as string]));

  // Build action items map by meetingId
  const actionsMap = new Map<string, ActionItem[]>();
  for (const aRow of actionsRes.data || []) {
    const act = mapActionItem(aRow as Record<string, unknown>, meetingsMap, usersMap, proofsMap);
    const existing = actionsMap.get(act.meetingId) || [];
    existing.push(act);
    actionsMap.set(act.meetingId, existing);
  }

  // Build participants map by meetingId
  const participantsMap = new Map<string, MeetingParticipant[]>();
  for (const partRow of participantsRes.data || []) {
    const part = mapParticipant(partRow as Record<string, unknown>);
    const existing = participantsMap.get(part.meetingId) || [];
    existing.push(part);
    participantsMap.set(part.meetingId, existing);
  }

  // Assemble full meeting objects
  let meetings: Meeting[] = rawMeetings.map(row => {
    const id = row.id as string;
    const creatorId = row.created_by_id as string;
    const creator = usersMap.get(creatorId);

    return {
      id,
      title: row.title as string,
      description: (row.description as string) || undefined,
      meetingType: (row.meeting_type as Meeting['meetingType']) || 'INTERNAL',
      status: (row.status as Meeting['status']) || 'COMPLETED',
      meetingDate: (row.meeting_date as string) || new Date().toISOString(),
      audioUrl: (row.audio_url as string) || undefined,
      audioDuration: (row.audio_duration as number) || undefined,
      transcript: (row.transcript as string) || undefined,
      summary: (row.summary as string) || undefined,
      department: (row.department as string) || undefined,
      createdById: creatorId,
      createdByName: creator?.name || (row.created_by_name as string) || '',
      participants: participantsMap.get(id) || [],
      actionItems: actionsMap.get(id) || [],
      createdAt: (row.created_at as string) || new Date().toISOString(),
      updatedAt: (row.updated_at as string) || new Date().toISOString(),
    };
  });

  // Role filtering for STAFF: only see meetings they participate in or created
  if (role === 'STAFF' && userId) {
    meetings = meetings.filter(m => 
      m.createdById === userId || 
      m.participants.some(p => p.userId === userId || p.email === usersMap.get(userId)?.email)
    );
  }

  return meetings;
}

export async function dbGetMeetingById(id: string): Promise<Meeting | null> {
  const meetings = await dbGetMeetings();
  return meetings.find(m => m.id === id) || null;
}

export async function dbCreateMeeting(meeting: {
  title: string;
  description?: string;
  meetingType: string;
  transcript?: string;
  summary?: string;
  audioUrl?: string;
  audioDuration?: number;
  department?: string;
  createdById: string;
  participants: { name: string; email: string; type: string; userId?: string }[];
}): Promise<Meeting> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: meeting.title,
      description: meeting.description || null,
      meeting_type: meeting.meetingType || 'INTERNAL',
      status: 'COMPLETED',
      transcript: meeting.transcript || null,
      summary: meeting.summary || null,
      audio_url: meeting.audioUrl || null,
      audio_duration: meeting.audioDuration || null,
      department: meeting.department || null,
      created_by_id: meeting.createdById,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const meetingId = (data as Record<string, string>).id;

  // Insert participants
  if (meeting.participants.length > 0) {
    await supabase.from('meeting_participants').insert(
      meeting.participants.map(p => ({
        meeting_id: meetingId,
        user_id: p.userId || null,
        email: p.email,
        name: p.name,
        type: p.type || 'INTERNAL',
      }))
    );
  }

  const created = await dbGetMeetingById(meetingId);
  return created!;
}

export async function dbUpdateMeeting(
  id: string,
  updates: {
    title?: string;
    description?: string;
    meetingType?: string;
    meetingDate?: string;
    transcript?: string;
    summary?: string;
    audioUrl?: string;
    audioDuration?: number;
    department?: string;
    participants?: { name: string; email: string; type: string; userId?: string }[];
  }
): Promise<Meeting> {
  const supabase = getServiceClient();

  const meetingUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) meetingUpdate.title = updates.title;
  if (updates.description !== undefined) meetingUpdate.description = updates.description;
  if (updates.meetingType !== undefined) meetingUpdate.meeting_type = updates.meetingType;
  if (updates.meetingDate !== undefined) meetingUpdate.meeting_date = updates.meetingDate;
  if (updates.transcript !== undefined) meetingUpdate.transcript = updates.transcript;
  if (updates.summary !== undefined) meetingUpdate.summary = updates.summary;
  if (updates.audioUrl !== undefined) meetingUpdate.audio_url = updates.audioUrl;
  if (updates.audioDuration !== undefined) meetingUpdate.audio_duration = updates.audioDuration;
  if (updates.department !== undefined) meetingUpdate.department = updates.department;

  const { error } = await supabase
    .from('meetings')
    .update(meetingUpdate)
    .eq('id', id);

  if (error) throw new Error(error.message);

  if (updates.participants) {
    // Delete existing participants and insert updated ones
    await supabase.from('meeting_participants').delete().eq('meeting_id', id);
    if (updates.participants.length > 0) {
      await supabase.from('meeting_participants').insert(
        updates.participants.map(p => ({
          meeting_id: id,
          user_id: p.userId || null,
          email: p.email,
          name: p.name,
          type: p.type || 'INTERNAL',
        }))
      );
    }
  }

  const updated = await dbGetMeetingById(id);
  return updated!;
}

export async function dbDeleteMeeting(id: string): Promise<void> {
  const supabase = getServiceClient();
  // Delete cascading items
  await supabase.from('meeting_participants').delete().eq('meeting_id', id);
  await supabase.from('action_items').delete().eq('meeting_id', id);
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Action Items ────────────────────────────────────────────────────────────

export async function dbGetActionItems(filters?: {
  status?: string;
  assigneeId?: string;
  meetingId?: string;
  userId?: string;
  role?: string;
}): Promise<ActionItem[]> {
  const supabase = getServiceClient();

  let query = supabase
    .from('action_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.meetingId) query = query.eq('meeting_id', filters.meetingId);

  if (filters?.role === 'STAFF' && filters?.userId) {
    query = query.eq('assignee_id', filters.userId);
  } else if (filters?.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }

  const [actionsRes, meetingsRes, proofsRes, users] = await Promise.all([
    query,
    supabase.from('meetings').select('id, title'),
    supabase.from('proof_submissions').select('*').order('submitted_at', { ascending: false }),
    dbGetUsers(),
  ]);

  if (actionsRes.error) {
    console.error('dbGetActionItems error:', actionsRes.error);
    throw new Error(actionsRes.error.message);
  }

  const usersMap = new Map<string, User>(users.map(u => [u.id, u]));
  const meetingsMap = new Map<string, string>(
    ((meetingsRes.data || []) as Record<string, string>[]).map(m => [m.id, m.title])
  );

  const proofsMap = new Map<string, ProofSubmission[]>();
  for (const pRow of proofsRes.data || []) {
    const p = mapProofSubmission(pRow as Record<string, unknown>, usersMap);
    const existing = proofsMap.get(p.actionItemId) || [];
    existing.push(p);
    proofsMap.set(p.actionItemId, existing);
  }

  return (actionsRes.data || []).map(row => 
    mapActionItem(row as Record<string, unknown>, meetingsMap, usersMap, proofsMap)
  );
}

export async function dbGetActionItemById(id: string): Promise<ActionItem | null> {
  const items = await dbGetActionItems();
  return items.find(a => a.id === id) || null;
}

export async function dbCreateActionItem(item: {
  meetingId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeEmail?: string;
  dueDate: string;
  priority: string;
  aiGuidance?: string;
}): Promise<ActionItem> {
  const supabase = getServiceClient();

  let assigneeEmail = item.assigneeEmail;
  if (item.assigneeId && !assigneeEmail) {
    const { data: user } = await supabase.from('users').select('email').eq('id', item.assigneeId).maybeSingle();
    if (user) assigneeEmail = (user as Record<string, string>).email;
  }

  const { data, error } = await supabase
    .from('action_items')
    .insert({
      meeting_id: item.meetingId,
      title: item.title,
      description: item.description || null,
      assignee_id: item.assigneeId || null,
      assignee_email: assigneeEmail || null,
      due_date: item.dueDate,
      priority: item.priority || 'MEDIUM',
      status: 'PENDING',
      ai_guidance: item.aiGuidance || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const actionId = (data as Record<string, string>).id;

  const items = await dbGetActionItems({ meetingId: item.meetingId });
  return items.find(a => a.id === actionId) || mapActionItem(data as Record<string, unknown>);
}

export async function dbUpdateActionItemAiGuidance(id: string, aiGuidance: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('action_items')
    .update({ ai_guidance: aiGuidance, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function dbUpdateMeetingTranscriptAndSummary(id: string, transcript: string, summary: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('meetings')
    .update({ transcript, summary, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function dbUpdateActionItemStatus(
  id: string,
  status: string
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('action_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function dbUpdateActionItem(
  id: string,
  updates: {
    title?: string;
    description?: string;
    assigneeId?: string;
    assigneeEmail?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
    aiGuidance?: string;
  }
): Promise<ActionItem> {
  const supabase = getServiceClient();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.assigneeId !== undefined) {
    payload.assignee_id = updates.assigneeId || null;
    if (updates.assigneeId) {
      const { data: user } = await supabase.from('users').select('email').eq('id', updates.assigneeId).maybeSingle();
      if (user) payload.assignee_email = (user as Record<string, string>).email;
    }
  }
  if (updates.assigneeEmail !== undefined) payload.assignee_email = updates.assigneeEmail;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.aiGuidance !== undefined) payload.ai_guidance = updates.aiGuidance;

  const { error } = await supabase
    .from('action_items')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(error.message);

  const item = await dbGetActionItemById(id);
  return item!;
}

export async function dbDeleteActionItem(id: string): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from('proof_submissions').delete().eq('action_item_id', id);
  const { error } = await supabase.from('action_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function dbUpdateActionItemReminder(id: string): Promise<void> {
  const supabase = getServiceClient();
  const { data } = await supabase.from('action_items').select('reminder_count').eq('id', id).maybeSingle();
  const count = ((data as Record<string, number>)?.reminder_count || 0) + 1;
  await supabase
    .from('action_items')
    .update({ reminder_count: count, last_reminder_sent_at: new Date().toISOString() })
    .eq('id', id);
}

// ─── Proof Submissions ───────────────────────────────────────────────────────

export async function dbSubmitProof(
  actionItemId: string,
  proof: {
    submittedById: string;
    notes: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
  }
): Promise<ActionItem> {
  const supabase = getServiceClient();

  const { error: proofError } = await supabase.from('proof_submissions').insert({
    action_item_id: actionItemId,
    submitted_by_id: proof.submittedById,
    notes: proof.notes,
    file_url: proof.fileUrl || null,
    file_name: proof.fileName || null,
    file_type: proof.fileType || null,
    status: 'PENDING',
  });

  if (proofError) throw new Error(proofError.message);

  // Update action item status to SUBMITTED
  await dbUpdateActionItemStatus(actionItemId, 'SUBMITTED');

  // Return updated action item
  const { data } = await supabase
    .from('action_items')
    .select('meeting_id')
    .eq('id', actionItemId)
    .maybeSingle();
  const meetingId = (data as Record<string, string>)?.meeting_id;

  const items = await dbGetActionItems({ meetingId });
  return items.find(a => a.id === actionItemId)!;
}

export async function dbReviewProof(
  actionItemId: string,
  proofId: string,
  status: 'APPROVED' | 'REJECTED',
  reviewNotes: string,
  reviewerId: string
): Promise<ActionItem> {
  const supabase = getServiceClient();

  await supabase
    .from('proof_submissions')
    .update({
      status,
      review_notes: reviewNotes,
      reviewed_by_id: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proofId);

  // Update action item status
  await dbUpdateActionItemStatus(actionItemId, status);

  const { data } = await supabase
    .from('action_items')
    .select('meeting_id')
    .eq('id', actionItemId)
    .maybeSingle();
  const meetingId = (data as Record<string, string>)?.meeting_id;

  const items = await dbGetActionItems({ meetingId });
  return items.find(a => a.id === actionItemId)!;
}
