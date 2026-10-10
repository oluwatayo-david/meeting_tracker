'use client';

/*
 * The meeting workspace (apps/web MeetingLiveView + RecordingPanel +
 * TranscriptViewer) and the Submit Proof modal (SubmitProofModal),
 * re-created as self-playing product moments.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Link as LinkIcon,
  Lock,
  MessageSquare,
  Mic,
  Pause,
  Radio,
  Sparkles,
  Square,
  UploadCloud,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIONS, AppToast, MEETING } from './primitives';
import { useTimeline } from './app-views';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function useTypewriter(text: string, start: boolean, cps = 38) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) {
      setCount(0);
      return;
    }
    const id = setInterval(() => setCount((c) => (c >= text.length ? c : c + 1)), 1000 / cps);
    return () => clearInterval(id);
  }, [start, text, cps]);
  return text.slice(0, count);
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const Caret: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn('caret ml-px inline-block h-3 w-px translate-y-0.5 bg-slate-700', className)} />
);

/* ─── Meeting workspace shell ─────────────────────────────────────────────── */

type Panel = 'recording' | 'transcript';

const MeetingShell: React.FC<{ panel: Panel; segments: number; actions: number; children: React.ReactNode }> = ({
  panel,
  segments,
  actions,
  children,
}) => {
  const panels = [
    { id: 'recording', label: 'Recording', icon: Mic },
    { id: 'transcript', label: 'Transcript', icon: FileText, badge: segments },
    { id: 'actions', label: 'Action Points', icon: Sparkles, badge: actions },
  ];
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#0f172a] text-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{MEETING.title}</p>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                INTERNAL
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {MEETING.date}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {MEETING.attendees} attendees
              </span>
            </div>
          </div>
        </div>
        <span className="rounded-xl p-2 text-slate-400">
          <X className="h-5 w-5" />
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-violet-500/20 bg-violet-500/10 px-6 py-2 text-xs font-medium text-violet-300">
        <Lock className="h-3.5 w-3.5" /> Internal meeting — only invited participants can view this meeting
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-slate-700 px-6 py-3">
        {panels.map((p, i) => {
          const isActive = p.id === panel;
          return (
            <React.Fragment key={p.id}>
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold',
                  isActive ? 'bg-violet-600 text-white shadow' : 'text-slate-400'
                )}
              >
                <p.icon className="h-3.5 w-3.5" />
                {p.label}
                {!!p.badge && (
                  <span className={cn('ml-0.5 rounded-full px-1.5 text-[10px] font-bold', isActive ? 'bg-white/20' : 'bg-slate-600')}>
                    {p.badge}
                  </span>
                )}
              </span>
              {i < panels.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-6 py-5">{children}</div>
    </div>
  );
};

/* ─── Recording ───────────────────────────────────────────────────────────── */

const SEGMENTS = [
  { t: 724, text: 'We still have no owner for the Q4 field survey — we need that settled today.' },
  { t: 731, text: 'I can take it. I’ll have the questionnaire drafted by Friday the 17th.', highlight: true },
  { t: 746, text: 'Good. Finance also needs the revised budget before the board pack goes out.' },
];
const LIVE = 'Amara, can you send the revised budget to Finance by the 18th?';

export const RecordingScreen: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const step = useTimeline(ref, [600, 2200, 3800, 4600], 13000);
  const live = useTypewriter(LIVE, step >= 4, 30);
  const [seconds, setSeconds] = useState(724);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [inView]);

  const shown = SEGMENTS.slice(0, Math.min(step, 3));

  return (
    <div ref={ref} className="h-full w-full">
      <MeetingShell panel="recording" segments={shown.length} actions={0}>
        <div className="mx-auto flex h-full max-w-2xl flex-col space-y-4">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1 text-xs">
            {[
              { icon: Mic, label: 'Live Microphone' },
              { icon: UploadCloud, label: 'Upload Audio File' },
              { icon: FileText, label: 'Type Notes / Paste' },
            ].map((m, i) => (
              <span
                key={m.label}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold',
                  i === 0 ? 'bg-sky-600 text-white shadow' : 'text-slate-400'
                )}
              >
                <m.icon className="h-3.5 w-3.5" />
                <span>{m.label}</span>
              </span>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-400">
                    <Radio className="h-3 w-3" />
                    LIVE AUDIO CAPTURE
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">{fmt(seconds)}</span>
                </div>
                <p className="text-sm font-bold tracking-tight text-white">{MEETING.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200">
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </span>
                <span className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/25">
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>End & Extract Action Items</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-sky-400" /> Live Speech Transcription
              </span>
              <span className="text-[10px] font-normal text-slate-400">
                {shown.length} segment{shown.length === 1 ? '' : 's'} captured
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-end space-y-2.5 overflow-hidden py-3 [mask-image:linear-gradient(to_bottom,transparent,black_18%)]">
              {shown.map((seg, i) => (
                <motion.div
                  key={seg.t}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                  className={cn(
                    'rounded-xl border p-3 text-xs leading-relaxed',
                    seg.highlight
                      ? 'border-indigo-600/70 bg-indigo-950/50 text-indigo-100 shadow-sm'
                      : 'border-slate-700/70 bg-slate-800/80 text-slate-200'
                  )}
                >
                  <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>Segment #{i + 1}</span>
                    <span>{fmt(seg.t)}</span>
                  </div>
                  <p>{seg.text}</p>
                </motion.div>
              ))}
              {step >= 4 && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-sky-500/50 bg-sky-950/40 p-3 text-xs italic text-sky-200"
                >
                  <span className="mb-0.5 block font-mono text-[10px] not-italic text-sky-400">Listening live...</span>
                  &quot;{live}
                  <Caret className="bg-sky-300" />
                  &quot;
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </MeetingShell>
    </div>
  );
};

/* ─── Transcript & AI analysis ────────────────────────────────────────────── */

const HIGHLIGHTS = [
  { t: 731, reason: 'Ownership assigned', text: 'Tunde: “I can take it. I’ll have the questionnaire drafted by Friday the 17th.”' },
  { t: 752, reason: 'Deadline committed', text: 'Amara: “I’ll send the revised budget to Finance by the 18th.”' },
];

export const TranscriptScreen: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const words = MEETING.summary.split(' ');

  return (
    <div ref={ref} className="h-full w-full">
      <MeetingShell panel="transcript" segments={14} actions={3}>
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-violet-300">AI Meeting Summary</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">
              {words.map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, filter: 'blur(6px)' }}
                  animate={inView ? { opacity: 1, filter: 'blur(0px)' } : {}}
                  transition={{ delay: 0.2 + i * 0.035, duration: 0.4 }}
                >
                  {w}{' '}
                </motion.span>
              ))}
            </p>
          </div>

          <div className="flex gap-1 rounded-xl bg-slate-800/60 p-1">
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow">
              <Zap className="h-3.5 w-3.5" />
              AI Highlights ({HIGHLIGHTS.length})
            </span>
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400">
              <MessageSquare className="h-3.5 w-3.5" />
              Full Transcript
            </span>
          </div>

          <div className="space-y-2.5">
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={h.t}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.6 + i * 0.15, duration: 0.45 }}
                className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-md bg-slate-700/60 px-2 py-1 font-mono text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {fmt(h.t)}
                    </div>
                    <span className="text-xs font-medium text-violet-300">⚡ {h.reason}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="line-clamp-1 px-4 pb-3 text-xs text-slate-400">{h.text}</p>
              </motion.div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">AI Extracted {ACTIONS.length} Action Points</span>
            </div>
            {ACTIONS.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -14 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 2.2 + i * 0.18, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3.5"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-400">{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{item.description}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">👤 {item.assignee}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        item.priority === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-300'
                          : item.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                      )}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </MeetingShell>
    </div>
  );
};

/* ─── Submit Proof modal ──────────────────────────────────────────────────── */

const NOTES =
  'Updated line items 4–9 with the three new vendor quotes and added the Q3 variance note on page 2. Finance has the file for the board pack.';
const FILE_NAME = 'Revised_Programme_Budget_v3.xlsx';
const DOC_URL = 'https://drive.example.org/budget/q4-v3';

export const SubmitProofScreen: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const step = useTimeline(ref, [400, 4400, 5600, 6900, 7200, 10800], 12500);
  const notes = useTypewriter(NOTES, step >= 1, 40);
  const file = useTypewriter(FILE_NAME, step >= 2, 42);
  const url = useTypewriter(DOC_URL, step >= 3, 46);
  const pressed = step === 4;
  const sent = step === 5;
  const focus = step >= 3 ? 'url' : step >= 2 ? 'file' : step >= 1 ? 'notes' : null;
  const typing = !pressed && !sent;

  const field = (active: boolean) =>
    cn(
      'w-full rounded-xl border px-3 py-2 text-xs text-slate-800 transition-shadow',
      active ? 'border-indigo-400 ring-2 ring-indigo-500/60' : 'border-slate-300'
    );

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Submit Proof of Work</p>
            <p className="text-xs text-slate-500">Provide completion evidence for manager sign-off</p>
          </div>
        </div>
        <X className="h-5 w-5 text-slate-400" />
      </div>

      <div className="space-y-4 p-6">
        <div className="space-y-1 rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Action Point</span>
          <p className="font-bold text-slate-800">{ACTIONS[0].title}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-700">
            Completion Notes & Methodology Summary <span className="text-rose-500">*</span>
          </p>
          <div className={cn(field(focus === 'notes'), 'h-[84px] p-3 leading-relaxed')}>
            {notes || <span className="text-slate-400">Describe what was accomplished, baseline outcomes, and reference links...</span>}
            {focus === 'notes' && <Caret />}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            Evidence Attachment Name
          </p>
          <div className={field(focus === 'file')}>
            {file || <span className="text-slate-400">e.g. Field_Audit_Calibration_Report.pdf</span>}
            {focus === 'file' && <Caret />}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <LinkIcon className="h-3.5 w-3.5 text-sky-600" />
            Deliverable Storage / Document URL
          </p>
          <div className={field(focus === 'url' && typing)}>
            {url || <span className="text-slate-400">https://...</span>}
            {focus === 'url' && typing && <Caret />}
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs leading-relaxed text-indigo-900">
          Upon submission, this item will enter the <strong>Manager Verification Portal</strong> for review and sign-off.
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
          <span className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</span>
          <motion.span
            animate={{ scale: pressed ? 0.95 : 1 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20"
          >
            <UploadCloud className="h-4 w-4" />
            <span>{typing ? 'Submit for Manager Sign-off' : 'Submitting...'}</span>
          </motion.span>
        </div>
      </div>

      <AppToast show={sent} message="Proof submitted! Awaiting manager verification." />
    </div>
  );
};
