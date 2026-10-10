/**
 * authz.ts
 * -------------------------------------------------------
 * Single source of truth for who may see / change what. API routes use the
 * service-role client (which bypasses RLS), so every route MUST go through
 * these checks. They mirror the policies in supabase-security-fixes.sql.
 *
 *  ADMIN   — everything
 *  MANAGER — meetings (and their action items) in their own department
 *  STAFF   — meetings they organised or were invited to; action items
 *            assigned to them
 */

import type { ActionItem, Meeting } from '@/types';

export interface Viewer {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  department: string;
}

function isParticipant(viewer: Viewer, meeting: Meeting): boolean {
  const email = viewer.email.toLowerCase();
  return meeting.participants.some(p => p.userId === viewer.id || p.email?.toLowerCase() === email);
}

function isDeptManager(viewer: Viewer, meeting: Meeting): boolean {
  // Meetings with no department (legacy rows) are visible to any manager.
  return viewer.role === 'MANAGER' && (!meeting.department || meeting.department === viewer.department);
}

/** Organiser, admin, or a manager of the meeting's department. */
export function canManageMeeting(viewer: Viewer, meeting: Meeting): boolean {
  return viewer.role === 'ADMIN' || meeting.createdById === viewer.id || isDeptManager(viewer, meeting);
}

export function canViewMeeting(viewer: Viewer, meeting: Meeting): boolean {
  if (canManageMeeting(viewer, meeting) || isParticipant(viewer, meeting)) return true;
  // External meetings are open to the whole department.
  return meeting.meetingType === 'EXTERNAL' && !!meeting.department && meeting.department === viewer.department;
}

export function isAssignee(viewer: Viewer, item: ActionItem): boolean {
  return item.assigneeId === viewer.id
    || (!!item.assigneeEmail && item.assigneeEmail.toLowerCase() === viewer.email.toLowerCase());
}

export function canViewActionItem(viewer: Viewer, item: ActionItem, meeting: Meeting | undefined): boolean {
  if (viewer.role === 'ADMIN' || isAssignee(viewer, item)) return true;
  return !!meeting && canManageMeeting(viewer, meeting);
}

/** Deactivated accounts are banned in Supabase Auth (see dbSetUserActive). */
export function isDeactivated(bannedUntil: string | null | undefined): boolean {
  return !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
}

/** Statuses an assignee may set on their own item. Approval only comes through manager review. */
export const ASSIGNEE_SETTABLE_STATUSES: string[] = ['PENDING', 'IN_PROGRESS'];