// Extended types for the full application

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export type MeetingType = 'INTERNAL' | 'EXTERNAL';
export type ParticipantType = 'INTERNAL' | 'EXTERNAL';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MeetingStatus = 'SCHEDULED' | 'RECORDING' | 'PROCESSING' | 'COMPLETED';
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'processing';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatarUrl?: string;
  status?: 'PENDING' | 'ACTIVE' | 'DEACTIVATED';
  invitedAt?: string;
  createdAt: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string;
  email: string;
  name: string;
  type: ParticipantType;
  createdAt: string;
}

export interface ProofSubmission {
  id: string;
  actionItemId: string;
  submittedById: string;
  submittedByName?: string;
  notes: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  status: ReviewStatus;
  reviewNotes?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  submittedAt: string;
}

export interface AuditLog {
  id: string;
  actionItemId?: string;
  meetingId?: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  title: string;
  description: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
  aiGuidance?: string;
  reminderCount: number;
  lastReminderSentAt?: string;
  proofSubmissions: ProofSubmission[];
  auditLogs: AuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  speaker?: string;
  text: string;
  timestamp: number; // seconds
  isHighlight?: boolean;
  highlightReason?: string;
}

export interface MeetingInsight {
  keyTopics: string[];
  decisions: string[];
  risks: string[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'concerning';
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingType: MeetingType;
  status?: MeetingStatus;
  meetingDate: string;
  startedAt?: string;
  endedAt?: string;
  audioUrl?: string;
  audioDuration?: number;
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  summary?: string;
  insights?: MeetingInsight;
  department?: string;
  createdById: string;
  createdByName?: string;
  participants: MeetingParticipant[];
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
}
