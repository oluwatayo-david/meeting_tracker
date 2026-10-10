/*
 * Illustrative sample data for the product screens. Kept in a plain module
 * (not 'use client') so server components can pass it to the screens too.
 */

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export type Status = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ScreenUser = { name: string; email: string; department: string; role: Role };

export const USERS: Record<'manager' | 'staff' | 'admin', ScreenUser> = {
  manager: { name: 'Ngozi Adeyemi', email: 'ngozi.a@example.org', department: 'Programs', role: 'MANAGER' },
  staff: { name: 'Tunde Bello', email: 'tunde.b@example.org', department: 'Programs', role: 'STAFF' },
  admin: { name: 'Ifeoma Chukwu', email: 'ifeoma.c@example.org', department: 'Operations', role: 'ADMIN' },
};

export const MEETING = {
  title: 'Q4 Programme Review',
  date: '9 Oct 2026',
  attendees: 6,
  summary:
    'The team agreed the scope of the Q4 field survey and moved the partner review to 3 November. Budget sign-off was flagged as the main risk — Finance needs the revised figures before the board pack.',
};

export const ACTIONS: {
  id: string;
  title: string;
  description: string;
  assignee: string;
  due: string;
  priority: Priority;
  status: Status;
  reminders: number;
}[] = [
  {
    id: 'a1',
    title: 'Send revised budget to Finance',
    description: 'Update the programme budget with the new vendor quotes and add the Q3 variance note for the board pack.',
    assignee: 'Amara Okafor',
    due: 'Oct 18, 2026',
    priority: 'URGENT',
    status: 'SUBMITTED',
    reminders: 2,
  },
  {
    id: 'a2',
    title: 'Draft Q4 field survey questionnaire',
    description: 'First draft covering household income, access to services and the two new partner sites.',
    assignee: 'Tunde Bello',
    due: 'Oct 17, 2026',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    reminders: 0,
  },
  {
    id: 'a3',
    title: 'Book venue for partner review',
    description: 'Shortlist three venues near the office for 3 November and request quotes.',
    assignee: 'Grace Eze',
    due: 'Oct 24, 2026',
    priority: 'MEDIUM',
    status: 'PENDING',
    reminders: 1,
  },
];
