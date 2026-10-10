'use client';

/*
 * Page bodies of the real app, re-created for the landing page:
 * Overview (StatsOverview + page.tsx), Action Board (ActionItemsView),
 * Review Portal (ManagerPortalView) and Admin & Team (AdminPanelView).
 * Each one animates the way the product behaves when it first comes into view.
 */

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView } from 'motion/react';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Edit2,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  Pencil,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { APP_NAME, COPILOT_NAME } from '@synclog/brand';
import { BrandMark } from '@synclog/brand/mark';
import { cn } from '@/lib/utils';
import {
  ACTIONS,
  AppToast,
  PriorityBadge,
  StatusBadge,
  USERS,
  initials,
  useScreen,
  type Priority,
  type Status,
} from './primitives';

/* ─── Motion helpers ──────────────────────────────────────────────────────── */

/**
 * Steps through a timeline once the element is in view: returns how many of
 * the `at` timestamps (ms) have passed. With `loop`, replays every `loop` ms.
 */
export function useTimeline(ref: React.RefObject<Element | null>, at: number[], loop?: number) {
  const inView = useInView(ref, { amount: 0.35 });
  const [step, setStep] = useState(0);
  const key = at.join(',');

  useEffect(() => {
    if (!inView) return;
    const times = key ? key.split(',').map(Number) : [];
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setStep(0);
      timers = times.map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    };
    run();
    const interval = loop ? setInterval(run, loop) : undefined;
    return () => {
      timers.forEach(clearTimeout);
      if (interval) clearInterval(interval);
    };
  }, [inView, loop, key]);

  return step;
}

/** Counts up to `value` the first time it scrolls into view. */
export const CountUp: React.FC<{ value: number; suffix?: string; duration?: number }> = ({ value, suffix = '', duration = 1.4 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, value, suffix, duration]);
  return <span ref={ref}>{`0${suffix}`}</span>;
};

export const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, delay: 0.15 + i * 0.09, ease: [0.2, 0.7, 0.2, 1] as const },
});

/* ─── Overview (Dashboard) ────────────────────────────────────────────────── */

const RECENT_MEETINGS = [
  {
    title: 'Q4 Programme Review',
    type: 'INTERNAL',
    summary: 'Agreed the Q4 field survey scope, moved the partner review to 3 Nov and flagged budget sign-off as a risk.',
    attendees: 6,
    tasks: 5,
  },
  {
    title: 'Partner Sync — Lagos Field Office',
    type: 'EXTERNAL',
    summary: 'Partners confirmed November field dates; the data-sharing agreement must be signed before kickoff.',
    attendees: 9,
    tasks: 3,
  },
  {
    title: 'Finance Weekly',
    type: 'INTERNAL',
    summary: 'Cash-flow forecast reviewed and vendor payments approved up to the Q4 ceiling.',
    attendees: 4,
    tasks: 2,
  },
];

const URGENT_TASKS = [
  { title: 'Send revised budget to Finance', assignee: 'Amara Okafor', tag: 'REVIEW READY' },
  { title: 'Sign partner data-sharing agreement', assignee: 'Chidi Nwosu', tag: 'URGENT' },
  { title: 'Confirm field team logistics', assignee: 'Grace Eze', tag: 'REVIEW READY' },
];

const Kpi: React.FC<{
  i: number;
  label: string;
  icon: React.ElementType;
  tone: string;
  children: React.ReactNode;
}> = ({ i, label, icon: Icon, tone, children }) => (
  <motion.div {...rise(i)} className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', tone)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {children}
  </motion.div>
);

export const OverviewContent: React.FC = () => {
  const { compact } = useScreen();
  const ref = useRef<HTMLDivElement>(null);
  const step = useTimeline(ref, [2600, 7200], 14000);

  return (
    <div ref={ref} className="space-y-6">
      {/* Top banner */}
      <motion.div
        {...rise(0)}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl"
      >
        <div className="pointer-events-none absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className={cn('relative z-10 flex gap-6', compact ? 'flex-col' : 'items-center justify-between')}>
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-300">
              <BrandMark className="h-3.5 w-3.5 text-sky-400" />
              {APP_NAME}
            </div>
            <p className="text-3xl font-extrabold tracking-tight">Meeting Action Tracking & Execution Verification</p>
            <p className="text-sm leading-relaxed text-slate-300">
              Automatic transcription and action point extraction, the {COPILOT_NAME} for assignees, and a closed-loop manager
              verification portal with email reminders.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <span className="relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20">
              <span className="absolute inset-0 animate-ping rounded-xl bg-emerald-400/30 [animation-duration:2.4s]" />
              <FileCheck2 className="relative h-4 w-4" />
              <span className="relative">3 Deliverables Pending Review</span>
              <ArrowUpRight className="relative h-3.5 w-3.5" />
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white">
              Explore Action Board (25)
            </span>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-4')}>
        <Kpi i={0} label="Verification Rate" icon={CheckCircle2} tone="border-emerald-100 bg-emerald-50 text-emerald-600">
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              <CountUp value={68} suffix="%" />
            </span>
            <span className="flex items-center text-xs font-semibold text-emerald-600">
              <TrendingUp className="mr-0.5 h-3 w-3" /> +18% vs benchmark
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '68%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-2 rounded-full bg-emerald-500"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">17 of 25 action points signed off by managers</p>
        </Kpi>

        <Kpi i={1} label="Awaiting Manager Sign-off" icon={FileCheck2} tone="border-amber-100 bg-amber-50 text-amber-600">
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              <CountUp value={3} />
            </span>
            <span className="text-xs font-medium text-amber-600">Action Required</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Assigned leads uploaded deliverables awaiting review</p>
          <div className="mt-3 flex items-center text-xs font-bold text-sky-600">
            Open Review Inbox <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </div>
        </Kpi>

        <Kpi i={2} label="Active In Pipeline" icon={Clock} tone="border-indigo-100 bg-indigo-50 text-indigo-600">
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              <CountUp value={8} />
            </span>
            <span className="text-xs text-slate-500">(5 in progress, 3 open)</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
              <AlertTriangle className="h-3 w-3" /> 2 Urgent
            </span>
            <span className="text-xs text-slate-500">Avg turnaround: 3.2 days</span>
          </div>
        </Kpi>

        <Kpi i={3} label="Meetings & Email Reminders" icon={Send} tone="border-sky-100 bg-sky-50 text-sky-600">
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              <CountUp value={14} />
            </span>
            <span className="text-xs text-slate-500">logged meetings</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">23 deadline reminders emailed to assignees</p>
        </Kpi>
      </div>

      <div className={cn('grid gap-8', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <motion.div {...rise(4)} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-slate-900">Recent Meetings</p>
            <span className="text-xs font-semibold text-sky-600">View all (14) →</span>
          </div>
          <div className="space-y-3">
            {RECENT_MEETINGS.map((m) => (
              <div key={m.title} className="space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-bold text-slate-800">{m.title}</span>
                  <span className="ml-2 shrink-0 text-[10px] font-bold uppercase text-slate-500">{m.type}</span>
                </div>
                <p className="line-clamp-2 text-xs text-slate-600">{m.summary}</p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>{m.attendees} attendees</span>
                  <span>{m.tasks} tasks delegated</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...rise(5)} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-slate-900">Urgent & Submitted Tasks</p>
            <span className="text-xs font-semibold text-indigo-600">Action board →</span>
          </div>
          <div className="space-y-3">
            {URGENT_TASKS.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 + i * 0.12, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-bold text-slate-800">{t.title}</p>
                  <p className="text-slate-500">
                    Assignee: <strong className="text-slate-700">{t.assignee}</strong>
                  </p>
                </div>
                <span
                  className={cn(
                    'ml-2 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold',
                    t.tag === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {t.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <AppToast show={step === 1} message="Proof submitted! Awaiting manager verification." />
    </div>
  );
};

/* ─── Action Board ────────────────────────────────────────────────────────── */

type BoardItem = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  due: string;
  priority: Priority;
  status: Status;
  reminders: number;
  meeting?: string;
  proof?: { date: string; notes: string; file?: string; status: 'PENDING' | 'APPROVED' };
};

export const MY_TASKS: BoardItem[] = [
  { ...ACTIONS[1], meeting: 'Q4 Programme Review' },
  {
    id: 's2',
    title: 'Collect site photos from Kano visit',
    description: 'Upload geotagged photos of both partner sites for the donor report.',
    assignee: 'Tunde Bello',
    due: 'Oct 8, 2026',
    priority: 'MEDIUM',
    status: 'APPROVED',
    reminders: 0,
    meeting: 'Partner Sync — Lagos Field Office',
    proof: { date: '10/7/2026', notes: '48 photos uploaded to the shared drive, sorted by site.', file: 'Kano_site_photos.zip', status: 'APPROVED' },
  },
  {
    id: 's3',
    title: 'Share survey draft with partners',
    description: 'Send the questionnaire draft to both partner leads for comments.',
    assignee: 'Tunde Bello',
    due: 'Oct 21, 2026',
    priority: 'MEDIUM',
    status: 'PENDING',
    reminders: 0,
    meeting: 'Q4 Programme Review',
  },
];

export const TEAM_TASKS: BoardItem[] = ACTIONS.map((a) => ({ ...a, meeting: 'Q4 Programme Review' }));

export const ActionBoardContent: React.FC<{ items: BoardItem[]; mine?: boolean; viewer: 'STAFF' | 'MANAGER' }> = ({
  items,
  mine,
  viewer,
}) => {
  const { compact } = useScreen();
  const isManager = viewer === 'MANAGER';
  const me = viewer === 'STAFF' ? USERS.staff.name : USERS.manager.name;

  return (
    <div className="space-y-6">
      <div className={cn('flex gap-4', compact ? 'flex-col' : 'items-center justify-between')}>
        <div>
          <p className="text-xl font-bold tracking-tight text-slate-900">Action Points Delegation Board</p>
          <p className="text-xs text-slate-500">Track ownership, timelines, AI research co-piloting, and proof submissions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold',
              mine ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'
            )}
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>Assigned to Me</span>
          </span>
          <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-100 p-1 text-xs">
            {['all', 'pending', 'in progress', 'submitted', 'approved'].map((s, i) => (
              <span
                key={s}
                className={cn('rounded-lg px-2.5 py-1 font-semibold capitalize', i === 0 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600')}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => {
          const isUrgent = item.priority === 'URGENT' && item.status !== 'APPROVED';
          const isAssignee = item.assignee === me;
          return (
            <motion.div
              key={item.id}
              {...rise(i)}
              className={cn(
                'space-y-4 rounded-2xl border bg-white p-5 shadow-xs',
                isUrgent ? 'border-rose-200/90 ring-1 ring-rose-200/50' : 'border-slate-200/80'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    <PriorityBadge priority={item.priority} />
                    {item.meeting && <span className="max-w-xs truncate text-xs font-medium text-slate-500">From: {item.meeting}</span>}
                  </div>
                  <p className="text-base font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs leading-relaxed text-slate-600">{item.description}</p>
                </div>
                <div className="flex items-center gap-1.5 self-start">
                  {item.reminders > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      <Send className="h-3 w-3" /> {item.reminders} Reminders
                    </span>
                  )}
                  <span className="rounded-lg border border-slate-200 p-1.5 text-slate-400">
                    <History className="h-4 w-4" />
                  </span>
                  <span className="rounded-lg border border-slate-200 p-1.5 text-slate-500">
                    <Edit2 className="h-3.5 w-3.5" />
                  </span>
                  {isManager && (
                    <span className="rounded-lg border border-slate-200 p-1.5 text-slate-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.45 + i * 0.12 }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700"
                    >
                      {item.assignee.charAt(0)}
                    </motion.div>
                    <div>
                      <span className="font-semibold text-slate-800">{item.assignee}</span>
                      {isAssignee && <span className="ml-1 text-[10px] font-bold text-sky-600">(You)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-medium text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Due: {item.due}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50 to-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{COPILOT_NAME}</span>
                  </span>
                  {isManager && item.status !== 'APPROVED' && (
                    <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <Send className="h-3 w-3 text-sky-600" />
                      <span>Send Reminder</span>
                    </span>
                  )}
                  {item.status !== 'APPROVED' && (
                    <span className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs">
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{item.status === 'SUBMITTED' ? 'Update Proof' : 'Submit Proof'}</span>
                    </span>
                  )}
                </div>
              </div>

              {item.proof && (
                <div className="space-y-1 rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-bold text-slate-800">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                      Latest Deliverable Submitted ({item.proof.date})
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase',
                        item.proof.status === 'APPROVED' ? 'text-emerald-700' : 'text-amber-700'
                      )}
                    >
                      {item.proof.status}
                    </span>
                  </div>
                  <p className="italic text-slate-600">&quot;{item.proof.notes}&quot;</p>
                  {item.proof.file && <p className="font-mono text-[11px] text-sky-600">Attachment: {item.proof.file}</p>}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Review Portal ───────────────────────────────────────────────────────── */

const Cursor: React.FC<{ go: boolean; press: boolean }> = ({ go, press }) => (
  <motion.svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    initial={{ x: -190, y: -110, opacity: 0 }}
    animate={go ? { x: 70, y: 14, opacity: 1, scale: press ? 0.86 : 1 } : { x: -190, y: -110, opacity: 0 }}
    transition={{ duration: go && !press ? 1.1 : 0.15, ease: [0.4, 0, 0.2, 1] }}
    className="pointer-events-none absolute left-0 top-0 z-20 drop-shadow-[0_2px_4px_rgb(0_0_0/0.35)]"
  >
    <path d="M4 2l15 11.5-6.6 1.1 3.9 7.4-2.9 1.5-3.9-7.5L4 20.6z" fill="#0f172a" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
  </motion.svg>
);

/** `animated` plays: cursor glides to Approve → click → item flips to Approved → toast. Loops. */
export const ReviewPortalContent: React.FC<{ animated?: boolean }> = ({ animated = true }) => {
  const { compact } = useScreen();
  const ref = useRef<HTMLDivElement>(null);
  const step = useTimeline(ref, animated ? [700, 1900, 2150, 6400] : [], animated ? 8000 : undefined);
  const approved = step === 3;
  const a = ACTIONS[0];

  return (
    <div ref={ref} className="space-y-6">
      <div className={cn('flex gap-4', compact ? 'flex-col' : 'items-center justify-between')}>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold tracking-tight text-slate-900">Manager Verification & Sign-Off Portal</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> High-Assurance Gate
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Strict verification authority: Only managers and admins can approve or request revisions for submitted action deliverables.
          </p>
        </div>
        <div className="inline-flex shrink-0 self-start rounded-xl border border-slate-200/80 bg-slate-100 p-1 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-900 shadow-xs">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Pending Review ({approved ? 2 : 3})</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-slate-600">
            <History className="h-3.5 w-3.5 text-indigo-600" />
            <span>Audit History ({approved ? 13 : 12})</span>
          </span>
        </div>
      </div>

      <motion.div
        {...rise(0)}
        className={cn(
          'space-y-4 rounded-2xl border bg-white p-5 shadow-xs transition-[border-color,box-shadow] duration-500',
          approved ? 'border-emerald-300 ring-4 ring-emerald-500/10' : 'border-slate-200/90'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
                              {approved ? (
                  <motion.span
                    key="ok"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                   
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700"
                  >
                    <Check className="h-3 w-3" /> APPROVED
                  </motion.span>
                ) : (
                  <motion.span
                    key="ready"
                   
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" /> Ready for Verification
                  </motion.span>
                )}
              <span className="text-xs font-medium text-slate-500">Meeting: Q4 Programme Review</span>
            </div>
            <p className="text-base font-bold text-slate-900">{a.title}</p>
            <p className="text-xs leading-relaxed text-slate-600">{a.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 self-start rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">A</div>
            <div className="text-xs">
              <p className="font-semibold text-slate-800">{a.assignee}</p>
              <p className="text-[11px] text-slate-500">Assignee</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5 font-bold text-indigo-900">
              <FileText className="h-4 w-4 text-indigo-600" />
              Submitted Evidence & Deliverable Notes
            </span>
            {!compact && <span className="font-mono text-[11px] text-slate-400">Submitted: 10/16/2026, 4:12:09 PM</span>}
          </div>
          <p className="rounded-lg border border-slate-200/70 bg-white p-3 text-xs leading-relaxed text-slate-700">
            &quot;Updated line items 4–9 with the three new vendor quotes and added the Q3 variance note on page 2. Finance has the
            file for the board pack.&quot;
          </p>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
            <div className="flex items-center gap-2 font-mono text-slate-800">
              <FileText className="h-4 w-4 text-sky-600" />
              <span>Revised_Programme_Budget_v3.xlsx</span>
            </div>
            <span className="flex items-center gap-1 font-semibold text-sky-600">
              <span>Inspect Deliverable</span>
              <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>

        <div className="flex h-[49px] items-center justify-end gap-3 border-t border-slate-100 pt-2">
                      {approved ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
               
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Approved by {USERS.manager.name} · just now
              </motion.span>
            ) : (
              <motion.div key="actions" className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-semibold text-rose-700">
                  <X className="h-4 w-4" />
                  <span>Request Revision</span>
                </span>
                <motion.span
                  animate={{ scale: step === 2 ? 0.94 : 1 }}
                  transition={{ duration: 0.12 }}
                  className="relative flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20"
                >
                  <Check className="h-4 w-4" />
                  <span>Approve Deliverable</span>
                  {animated && <Cursor go={step >= 1} press={step === 2} />}
                </motion.span>
              </motion.div>
            )}
        </div>
      </motion.div>

      <motion.div {...rise(1)} className="space-y-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            <FileCheck2 className="h-3.5 w-3.5" /> Ready for Verification
          </span>
          <span className="text-xs font-medium text-slate-500">Meeting: Partner Sync — Lagos Field Office</span>
        </div>
        <p className="text-base font-bold text-slate-900">Confirm field team logistics</p>
        <p className="text-xs leading-relaxed text-slate-600">Transport, accommodation and per-diems confirmed for both field teams.</p>
      </motion.div>

      <AppToast show={approved} message="Deliverable approved! Task marked complete." />
    </div>
  );
};

/* ─── Admin & Team ────────────────────────────────────────────────────────── */

const ROSTER: {
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  dept: string;
  joined: string;
  you?: boolean;
  status?: 'PENDING' | 'DEACTIVATED';
}[] = [
  { name: USERS.admin.name, email: USERS.admin.email, role: 'ADMIN', dept: 'Operations', joined: '1/12/2026', you: true },
  { name: USERS.manager.name, email: USERS.manager.email, role: 'MANAGER', dept: 'Programs', joined: '2/3/2026' },
  { name: 'Amara Okafor', email: 'amara.o@example.org', role: 'MANAGER', dept: 'Finance', joined: '2/3/2026' },
  { name: USERS.staff.name, email: USERS.staff.email, role: 'STAFF', dept: 'Programs', joined: '3/18/2026' },
  { name: 'Chidi Nwosu', email: 'chidi.n@example.org', role: 'STAFF', dept: 'Finance', joined: '10/9/2026', status: 'PENDING' },
  { name: 'Kemi Lawal', email: 'kemi.l@example.org', role: 'STAFF', dept: 'Programs', joined: '4/2/2026', status: 'DEACTIVATED' },
];

const roleBadge = (role: string) =>
  role === 'ADMIN'
    ? 'bg-rose-100 text-rose-700 border border-rose-200'
    : role === 'MANAGER'
      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
      : 'bg-sky-100 text-sky-700 border border-sky-200';

const RoleIcon: React.FC<{ role: string }> = ({ role }) =>
  role === 'ADMIN' ? (
    <Crown className="h-3.5 w-3.5 text-rose-500" />
  ) : role === 'MANAGER' ? (
    <Shield className="h-3.5 w-3.5 text-indigo-500" />
  ) : (
    <UserIcon className="h-3.5 w-3.5 text-sky-500" />
  );

export const AdminRosterContent: React.FC = () => {
  const { compact } = useScreen();
  return (
    <div className="space-y-6">
      <div className={cn('flex gap-4', compact ? 'flex-col' : 'items-center justify-between')}>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-slate-900">Organization Team & Role Administration</p>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', roleBadge('ADMIN'))}>
              <RoleIcon role="ADMIN" /> ADMIN
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Onboard managers & staff, provision accounts, and manage departmental structures.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs">
            <RefreshCw className="h-4 w-4" />
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/20">
            <UserPlus className="h-4 w-4" />
            <span>+ Onboard Team Member</span>
          </span>
        </div>
      </div>

      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-3')}>
        {[
          { label: 'Administrators', count: 1, icon: Crown, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50/70', text: 'text-rose-800', border: 'border-rose-200' },
          { label: 'Department Managers', count: 4, icon: Shield, color: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50/70', text: 'text-indigo-800', border: 'border-indigo-200' },
          { label: 'Operational Staff', count: 27, icon: Briefcase, color: 'from-sky-500 to-cyan-600', bg: 'bg-sky-50/70', text: 'text-sky-800', border: 'border-sky-200' },
        ].map((s, i) => (
          <motion.div key={s.label} {...rise(i)} className={cn('space-y-2 rounded-2xl border p-[18px] shadow-xs', s.border, s.bg)}>
            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-semibold uppercase tracking-wider opacity-80', s.text)}>{s.label}</span>
              <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br shadow-xs', s.color)}>
                <s.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className={cn('text-2xl font-black', s.text)}>
              <CountUp value={s.count} />
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div {...rise(3)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-600" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Active Team Roster (32)</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {ROSTER.map((u, i) => (
            <motion.div
              key={u.email}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.07, duration: 0.45 }}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                  {initials(u.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs font-bold text-slate-900">{u.name}</p>
                    {u.you && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">You</span>}
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', roleBadge(u.role))}>
                      <RoleIcon role={u.role} /> {u.role}
                    </span>
                    {u.status === 'DEACTIVATED' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        <Ban className="h-3 w-3" /> Deactivated
                      </span>
                    )}
                    {u.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Clock className="h-3 w-3" /> Pending Acceptance
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="truncate">{u.email}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      {u.dept}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs">
                  <Pencil className="h-3 w-3" />
                  Edit
                </span>
                {!compact && <span className="font-mono text-[10px] text-slate-400">Joined: {u.joined}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
