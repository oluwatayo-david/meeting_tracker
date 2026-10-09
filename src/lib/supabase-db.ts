/**
 * supabase-db.ts
 * -------------------------------------------------------
 * Centralised Supabase data-access layer.
 * All API routes call these helpers.
 * Handles snake_case ↔ camelCase mapping and joins in-memory
 * to prevent PostgREST schema-cache relationship errors.
 *
 * Filtering happens in the database: only the rows a caller needs (and the
 * related participants / items / proofs / users for those rows) are fetched.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  User,
  Meeting,
  ActionItem,
  ProofSubmission,
  MeetingParticipant,
} from '@/types';
import { getAuthCallbackUrl } from '@/lib/url';
import { canViewMeeting, type Viewer } from '@/lib/authz';

type Row = Record<string, unknown>;

let serviceClient: SupabaseClient | null = null;

// Service-role client for server-side API routes (bypasses RLS)
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return serviceClient;
}

// ─── Query helpers ───────────────────────────────────────────────────────────

const IN_CHUNK_SIZE = 150; // keeps PostgREST URLs well under length limits

function chunk<T>(items: T[], size = IN_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function uniq(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

/** Quotes a value for a PostgREST `or=(...)` filter (handles commas, dots, parentheses). */
function pgQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function newestFirst(field: string) {
  return (a: Row, b: Row) => String(b[field] ?? '').localeCompare(String(a[field] ?? ''));
}

function dedupeById(rows: Row[]): Row[] {
  const seen = new Map<string, Row>();
  for (const row of rows) seen.set(row.id as string, row);
  return [...seen.values()];
}

/** SELECT ... WHERE column IN (ids), chunked. */
async function selectIn(table: string, column: string, ids: string[], columns = '*'): Promise<Row[]> {
  const unique = uniq(ids);
  if (unique.length === 0) return [];
  const supabase = getServiceClient();
  const results = await Promise.all(
    chunk(unique).map(part => supabase.from(table).select(columns).in(column, part))
  );
  const rows: Row[] = [];
  for (const res of results) {
    if (res.error) throw new Error(res.error.message);
    rows.push(...((res.data || []) as unknown as Row[]));
  }
  return rows;
}

/** True when an RPC failed because supabase-hardening.sql has not been applied yet. */
function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''));
}

async function fetchUsersMap(ids: string[]): Promise<Map<string, User>> {
  const rows = await selectIn('users', 'id', ids);
  return new Map(rows.map(r => [r.id as string, mapUser(r)]));
}

// ─── Mappers ────────────────────────────────────────────────────────────────

export function mapUser(row: Row): User {
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
  row: Row,
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

export function mapParticipant(row: Row): MeetingParticipant {
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
  row: Row,
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

function mapMeeting(
  row: Row,
  usersMap: Map<string, User>,
  participantsMap: Map<string, MeetingParticipant[]>,
  actionsMap: Map<string, ActionItem[]>
): Meeting {
  const id = row.id as string;
  const creatorId = row.created_by_id as string;
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
    createdByName: usersMap.get(creatorId)?.name || (row.created_by_name as string) || '',
    participants: participantsMap.get(id) || [],
    actionItems: actionsMap.get(id) || [],
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

// ─── Assembly (fetch related rows for a set of parents only) ────────────────

async function assembleActionItems(actionRows: Row[], meetingTitles?: Map<string, string>): Promise<ActionItem[]> {
  if (actionRows.length === 0) return [];
  const itemIds = actionRows.map(r => r.id as string);

  const [proofRows, titleRows] = await Promise.all([
    selectIn('proof_submissions', 'action_item_id', itemIds),
    meetingTitles ? Promise.resolve([] as Row[]) : selectIn('meetings', 'id', actionRows.map(r => r.meeting_id as string), 'id, title'),
  ]);
  proofRows.sort(newestFirst('submitted_at'));

  const titles = meetingTitles || new Map(titleRows.map(m => [m.id as string, m.title as string]));
  const usersMap = await fetchUsersMap([
    ...actionRows.map(r => r.assignee_id as string),
    ...proofRows.map(p => p.submitted_by_id as string),
    ...proofRows.map(p => p.reviewed_by_id as string),
  ]);

  const proofsMap = groupBy(proofRows.map(p => mapProofSubmission(p, usersMap)), p => p.actionItemId);
  return [...actionRows]
    .sort(newestFirst('created_at'))
    .map(r => mapActionItem(r, titles, usersMap, proofsMap));
}

async function assembleMeetings(meetingRows: Row[]): Promise<Meeting[]> {
  if (meetingRows.length === 0) return [];
  const meetingIds = meetingRows.map(m => m.id as string);

  const [participantRows, actionRows, creatorsMap] = await Promise.all([
    selectIn('meeting_participants', 'meeting_id', meetingIds),
    selectIn('action_items', 'meeting_id', meetingIds),
    fetchUsersMap(meetingRows.map(m => m.created_by_id as string)),
  ]);

  const titles = new Map(meetingRows.map(m => [m.id as string, m.title as string]));
  const actionItems = await assembleActionItems(actionRows, titles);
  const actionsMap = groupBy(actionItems, a => a.meetingId);
  const participantsMap = groupBy(participantRows.map(mapParticipant), p => p.meetingId);

  return [...meetingRows]
    .sort(newestFirst('created_at'))
    .map(row => mapMeeting(row, creatorsMap, participantsMap, actionsMap));
}

// ─── Users ──────────────────────────────────────────────────────────────────

/** Full directory with invite/active status (admin panel and attendee picker). */
export async function dbGetUsers(): Promise<User[]> {
  const supabase = getServiceClient();

  const [{ data, error }, authUsers] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: false }),
    listAllAuthUsers(),
  ]);

  if (error) {
    console.error('dbGetUsers error:', error);
    return [];
  }

  const authUsersMap = new Map(authUsers.map(au => [au.id, au]));
  return (data || []).map(row => {
    const u = mapUser(row as Row);
    const au = authUsersMap.get(u.id);
    if (au) {
      const isPending = !au.last_sign_in_at && (Boolean(au.invited_at) || !au.confirmed_at);
      u.status = isPending ? 'PENDING' : 'ACTIVE';
      u.invitedAt = au.invited_at || undefined;
    } else {
      u.status = 'ACTIVE';
    }
    return u;
  });
}

/** listUsers is paginated (50 per page by default) — walk every page. */
async function listAllAuthUsers() {
  const supabase = getServiceClient();
  const perPage = 1000;
  const all: { id: string; last_sign_in_at?: string | null; confirmed_at?: string | null; invited_at?: string | null }[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;
    all.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return all;
}

/** Lightweight directory (no auth lookups) for name matching. */
export async function dbGetUserDirectory(): Promise<User[]> {
  const { data, error } = await getServiceClient().from('users').select('*');
  if (error) throw new Error(error.message);
  return (data || []).map(r => mapUser(r as Row));
}

/**
 * Matches an AI-suggested assignee name to a user. Requires a whole-word name
 * match (so "Al" no longer matches "Alice"), prefers meeting participants, and
 * returns undefined when ambiguous rather than guessing.
 */
export function matchAssignee(users: User[], suggested: string, participantEmails: string[] = []): User | undefined {
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const target = words(suggested || '');
  if (target.length === 0) return undefined;

  const exact = users.filter(u => words(u.name).join(' ') === target.join(' '));
  if (exact.length === 1) return exact[0];

  const partial = users.filter(u => {
    const name = words(u.name);
    return target.every(w => name.includes(w));
  });
  const emails = participantEmails.map(e => e.toLowerCase());
  const fromMeeting = partial.filter(u => emails.includes(u.email.toLowerCase()));
  if (fromMeeting.length === 1) return fromMeeting[0];
  return partial.length === 1 ? partial[0] : undefined;
}

export async function dbGetUserById(id: string): Promise<User | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return mapUser(data as Row);
}

export async function dbUpsertUser(user: Partial<User> & { id: string; email: string }): Promise<User> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email.toLowerCase(),
      role: user.role || 'STAFF',
      department: user.department || null,
      avatar_url: user.avatarUrl || null,
    }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapUser(data as Row);
}

/** A user editing their own profile: only cosmetic fields, never role/department/email. */
export async function dbUpdateOwnProfile(id: string, updates: { name?: string; avatarUrl?: string }): Promise<User> {
  const payload: Row = { updated_at: new Date().toISOString() };
  if (updates.name?.trim()) payload.name = updates.name.trim();
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl || null;
  const { data, error } = await getServiceClient()
    .from('users')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapUser(data as Row);
}

/** 14-char password from a CSPRNG (the old `Pass@NNNNNN` format had only 900k possibilities). */
function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  return `${body.slice(0, 6)}-${body.slice(6)}!`;
}

export async function dbOnboardUser(params: {
  email: string;
  name: string;
  role: User['role'];
  department: string;
  password?: string;
}): Promise<{ success: boolean; user?: User; tempPassword?: string; message: string }> {
  const supabase = getServiceClient();
  const password = params.password || generateTempPassword();

  // Direct user provisioning via Supabase Auth Admin API.
  // must_change_password lives in app_metadata, which users cannot edit themselves.
  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: password,
    email_confirm: true,
    app_metadata: { must_change_password: true },
    user_metadata: {
      full_name: params.name,
      name: params.name,
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
  department: string,
  req?: Request
): Promise<{ success: boolean; message: string }> {
  const supabase = getServiceClient();

  // Build dynamic redirect URL so the invitation link works in dev AND production
  const redirectTo = getAuthCallbackUrl(req);

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: name, name, department },
  });
  if (error) return { success: false, message: error.message };

  if (data?.user) {
    // Invited users arrive via a magic link with no password — make them set one.
    await supabase.auth.admin.updateUserById(data.user.id, {
      app_metadata: { ...(data.user.app_metadata || {}), must_change_password: true },
    });
    await dbUpsertUser({ id: data.user.id, name, email, role, department });
  }

  return { success: true, message: `Invitation sent to ${email}` };
}

/** Sets the caller's new password and clears the first-login flag. */
export async function dbCompletePasswordChange(userId: string, newPassword: string): Promise<void> {
  const supabase = getServiceClient();
  const { data: existing, error: getError } = await supabase.auth.admin.getUserById(userId);
  if (getError || !existing?.user) throw new Error(getError?.message || 'User not found');

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
    app_metadata: { ...(existing.user.app_metadata || {}), must_change_password: false },
  });
  if (error) throw new Error(error.message);
}

export async function dbUpdateUserRole(
  userId: string,
  role: User['role'],
  department?: string
): Promise<User> {
  const supabase = getServiceClient();
  const updatePayload: Row = { role };
  if (department) updatePayload.department = department;
  const { data, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return mapUser(data as Row);
}

// ─── Meetings ────────────────────────────────────────────────────────────────

/**
 * Pass a viewer to get only the meetings they may see (filtered in the
 * database, then re-checked with canViewMeeting). Omit for internal use.
 */
export async function dbGetMeetings(viewer?: Viewer): Promise<Meeting[]> {
  const supabase = getServiceClient();
  let rows: Row[];

  if (!viewer || viewer.role === 'ADMIN') {
    const { data, error } = await supabase.from('meetings').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    rows = (data || []) as Row[];
  } else {
    const clauses = [`created_by_id.eq.${viewer.id}`];
    if (viewer.role === 'MANAGER') {
      clauses.push('department.is.null');
      if (viewer.department) clauses.push(`department.eq.${pgQuote(viewer.department)}`);
    } else if (viewer.department) {
      clauses.push(`and(meeting_type.eq.EXTERNAL,department.eq.${pgQuote(viewer.department)})`);
    }

    const [ownRes, invitedRes] = await Promise.all([
      supabase.from('meetings').select('*').or(clauses.join(',')),
      supabase
        .from('meeting_participants')
        .select('meeting_id')
        .or(`user_id.eq.${viewer.id},email.eq.${pgQuote(viewer.email.toLowerCase())}`),
    ]);
    if (ownRes.error) throw new Error(ownRes.error.message);
    if (invitedRes.error) throw new Error(invitedRes.error.message);

    const own = (ownRes.data || []) as Row[];
    const ownIds = new Set(own.map(m => m.id as string));
    const invitedIds = ((invitedRes.data || []) as Row[])
      .map(p => p.meeting_id as string)
      .filter(id => !ownIds.has(id));
    rows = dedupeById([...own, ...(await selectIn('meetings', 'id', invitedIds))]);
  }

  const meetings = await assembleMeetings(rows);
  return viewer ? meetings.filter(m => canViewMeeting(viewer, m)) : meetings;
}

export async function dbGetMeetingById(id: string): Promise<Meeting | null> {
  const { data, error } = await getServiceClient().from('meetings').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [meeting] = await assembleMeetings([data as Row]);
  return meeting || null;
}

type ParticipantInput = { name: string; email: string; type: string; userId?: string };

/** Replaces the participant list atomically (RPC), falling back if the migration isn't applied. */
async function replaceParticipants(meetingId: string, participants: ParticipantInput[]): Promise<void> {
  const supabase = getServiceClient();
  const payload = participants.map(p => ({
    name: p.name,
    email: p.email.trim().toLowerCase(),
    type: p.type || 'INTERNAL',
    user_id: p.userId || null,
  }));

  const { error } = await supabase.rpc('replace_meeting_participants', {
    p_meeting_id: meetingId,
    p_participants: payload,
  });
  if (!error) return;
  if (!isMissingFunction(error)) throw new Error(error.message);

  console.warn('[DB] replace_meeting_participants missing — run supabase-hardening.sql. Using non-atomic fallback.');
  const del = await supabase.from('meeting_participants').delete().eq('meeting_id', meetingId);
  if (del.error) throw new Error(del.error.message);
  if (payload.length > 0) {
    const ins = await supabase.from('meeting_participants').insert(payload.map(p => ({ ...p, meeting_id: meetingId })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

export async function dbCreateMeeting(meeting: {
  title: string;
  description?: string;
  meetingType: string;
  meetingDate?: string;
  transcript?: string;
  summary?: string;
  audioUrl?: string;
  audioDuration?: number;
  department?: string;
  createdById: string;
  participants: ParticipantInput[];
}): Promise<Meeting> {
  const supabase = getServiceClient();
  const meetingDate = meeting.meetingDate || new Date().toISOString();
  // Future meetings are SCHEDULED; anything happening now (or with a transcript) is COMPLETED
  const isFuture = new Date(meetingDate).getTime() > Date.now() + 5 * 60 * 1000;
  const status = meeting.transcript || !isFuture ? 'COMPLETED' : 'SCHEDULED';

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: meeting.title,
      description: meeting.description || null,
      meeting_type: meeting.meetingType || 'INTERNAL',
      status,
      meeting_date: meetingDate,
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

  if (meeting.participants.length > 0) {
    try {
      await replaceParticipants(meetingId, meeting.participants);
    } catch (err) {
      // Don't leave a meeting with a half-written guest list behind
      await supabase.from('meetings').delete().eq('id', meetingId);
      throw err;
    }
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
    participants?: ParticipantInput[];
  }
): Promise<Meeting> {
  const supabase = getServiceClient();

  const meetingUpdate: Row = {
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
    await replaceParticipants(id, updates.participants);
  }

  const updated = await dbGetMeetingById(id);
  return updated!;
}

export async function dbDeleteMeeting(id: string): Promise<void> {
  // Participants, action items, proofs and audit logs go with it via ON DELETE CASCADE
  const { error } = await getServiceClient().from('meetings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Action Items ────────────────────────────────────────────────────────────

/**
 * Pass a viewer to get only their visible items: those assigned to them plus
 * those in meetings they manage. Filtering happens in the database.
 */
export async function dbGetActionItems(filters?: {
  status?: string;
  assigneeId?: string;
  meetingId?: string;
  viewer?: Viewer;
}): Promise<ActionItem[]> {
  const supabase = getServiceClient();
  const viewer = filters?.viewer;

  const build = () => {
    let q = supabase.from('action_items').select('*');
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.meetingId) q = q.eq('meeting_id', filters.meetingId);
    if (filters?.assigneeId) q = q.eq('assignee_id', filters.assigneeId);
    return q;
  };

  let rows: Row[];
  if (!viewer || viewer.role === 'ADMIN') {
    const { data, error } = await build();
    if (error) throw new Error(error.message);
    rows = (data || []) as Row[];
  } else {
    // Meetings this viewer manages (organiser, or manager of the department)
    const manageClauses = [`created_by_id.eq.${viewer.id}`];
    if (viewer.role === 'MANAGER') {
      manageClauses.push('department.is.null');
      if (viewer.department) manageClauses.push(`department.eq.${pgQuote(viewer.department)}`);
    }
    const managed = await supabase.from('meetings').select('id').or(manageClauses.join(','));
    if (managed.error) throw new Error(managed.error.message);
    const managedIds = ((managed.data || []) as Row[]).map(m => m.id as string);

    const results = await Promise.all([
      build().or(`assignee_id.eq.${viewer.id},assignee_email.eq.${pgQuote(viewer.email.toLowerCase())}`),
      ...chunk(managedIds).map(part => build().in('meeting_id', part)),
    ]);
    rows = [];
    for (const res of results) {
      if (res.error) throw new Error(res.error.message);
      rows.push(...((res.data || []) as Row[]));
    }
    rows = dedupeById(rows);
  }

  return assembleActionItems(rows);
}

export async function dbGetActionItemById(id: string): Promise<ActionItem | null> {
  const { data, error } = await getServiceClient().from('action_items').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [item] = await assembleActionItems([data as Row]);
  return item || null;
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
      assignee_email: assigneeEmail?.toLowerCase() || null,
      due_date: item.dueDate,
      priority: item.priority || 'MEDIUM',
      status: 'PENDING',
      ai_guidance: item.aiGuidance || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const created = await dbGetActionItemById((data as Record<string, string>).id);
  return created || mapActionItem(data as Row);
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
    .update({ transcript, summary, status: 'COMPLETED', updated_at: new Date().toISOString() })
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
  const payload: Row = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.assigneeId !== undefined) {
    payload.assignee_id = updates.assigneeId || null;
    if (updates.assigneeId) {
      const { data: user } = await supabase.from('users').select('email').eq('id', updates.assigneeId).maybeSingle();
      if (user) payload.assignee_email = (user as Record<string, string>).email.toLowerCase();
    }
  }
  if (updates.assigneeEmail !== undefined) payload.assignee_email = updates.assigneeEmail?.toLowerCase() || null;
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
  // Proof submissions and audit logs go with it via ON DELETE CASCADE
  const { error } = await getServiceClient().from('action_items').delete().eq('id', id);
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

  const { error } = await supabase.rpc('submit_proof', {
    p_action_item_id: actionItemId,
    p_submitted_by: proof.submittedById,
    p_notes: proof.notes,
    p_file_url: proof.fileUrl || null,
    p_file_name: proof.fileName || null,
    p_file_type: proof.fileType || null,
  });

  if (error && !isMissingFunction(error)) throw new Error(error.message);
  if (error) {
    console.warn('[DB] submit_proof missing — run supabase-hardening.sql. Using non-atomic fallback.');
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
    await dbUpdateActionItemStatus(actionItemId, 'SUBMITTED');
  }

  const item = await dbGetActionItemById(actionItemId);
  return item!;
}

export async function dbReviewProof(
  actionItemId: string,
  proofId: string,
  status: 'APPROVED' | 'REJECTED',
  reviewNotes: string,
  reviewerId: string
): Promise<ActionItem> {
  const supabase = getServiceClient();

  const { error } = await supabase.rpc('review_proof', {
    p_action_item_id: actionItemId,
    p_proof_id: proofId,
    p_status: status,
    p_review_notes: reviewNotes,
    p_reviewer: reviewerId,
  });

  if (error && !isMissingFunction(error)) throw new Error(error.message);
  if (error) {
    console.warn('[DB] review_proof missing — run supabase-hardening.sql. Using non-atomic fallback.');
    const { error: reviewError } = await supabase
      .from('proof_submissions')
      .update({
        status,
        review_notes: reviewNotes,
        reviewed_by_id: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proofId)
      .eq('action_item_id', actionItemId);
    if (reviewError) throw new Error(reviewError.message);
    await dbUpdateActionItemStatus(actionItemId, status);
  }

  const item = await dbGetActionItemById(actionItemId);
  return item!;
}