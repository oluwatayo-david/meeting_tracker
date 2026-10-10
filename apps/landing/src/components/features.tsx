import React from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CornerUpLeft,
  FileSpreadsheet,
  Link2,
  ListChecks,
  Sparkles,
  Target,
} from 'lucide-react';
import { COPILOT_NAME } from '@synclog/brand';
import { GlowingEffect } from './aceternity/glowing-effect';
import { Reveal } from './reveal';
import { Accent, Container, SectionHeading, cn } from './ui';

/* ─── Card shell ──────────────────────────────────────────────────────────── */

const Card: React.FC<{
  className?: string;
  delay?: number;
  label: string;
  title: string;
  body: string;
  children: React.ReactNode;
}> = ({ className, delay, label, title, body, children }) => (
  <Reveal delay={delay} className={cn('group relative rounded-3xl', className)}>
    {/* Aceternity Glowing Effect: a brand-gradient edge that follows the pointer */}
    <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface p-7 shadow-card ring-1 ring-line transition-shadow duration-300 group-hover:shadow-float sm:p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-4">{label}</p>
      <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-3">{body}</p>
      <div className="mt-8 flex flex-1 items-end" aria-hidden>
        <div className="w-full">{children}</div>
      </div>
    </div>
  </Reveal>
);

/* ─── Visuals (illustrative sample data, built in HTML) ───────────────────── */

const InsightsVisual = () => (
  <div className="grid gap-3 sm:grid-cols-3">
    {[
      { icon: Target, tone: 'text-brand bg-brand-soft', label: 'Decisions', lines: ['Adopt new survey vendor', 'Move review to Nov 3'] },
      { icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50', label: 'Risks', lines: ['Budget sign-off may slip'] },
      { icon: ListChecks, tone: 'text-emerald-700 bg-emerald-50', label: 'Next steps', lines: ['Share deck with partners', 'Confirm field dates'] },
    ].map((col) => (
      <div key={col.label} className="rounded-2xl bg-wash/70 p-4 ring-1 ring-line">
        <div className="flex items-center gap-2">
          <span className={cn('grid h-6 w-6 place-items-center rounded-lg', col.tone)}>
            <col.icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[12px] font-semibold text-ink-2">{col.label}</span>
        </div>
        <ul className="mt-3 space-y-2">
          {col.lines.map((l) => (
            <li key={l} className="rounded-lg bg-surface px-2.5 py-2 text-[12px] text-ink-2 ring-1 ring-line">
              {l}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const OwnersVisual = () => (
  <ul className="space-y-2">
    {[
      { i: 'TB', n: 'Tunde B.', d: 'Today', tone: 'text-rose-600' },
      { i: 'AO', n: 'Amara O.', d: 'Oct 18', tone: 'text-ink-3' },
      { i: 'GE', n: 'Grace E.', d: 'Oct 24', tone: 'text-ink-3' },
    ].map((o, idx) => (
      <li
        key={o.i}
        className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line transition-transform duration-300 group-hover:translate-x-1"
        style={{ transitionDelay: `${idx * 40}ms` }}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-[10px] font-semibold text-brand-ink">
          {o.i}
        </span>
        <span className="text-[13px] font-medium">{o.n}</span>
        <span className={cn('ml-auto font-mono text-[11px]', o.tone)}>{o.d}</span>
      </li>
    ))}
  </ul>
);

const ProofVisual = () => (
  <div className="space-y-2">
    <div className="flex items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-line">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
        <FileSpreadsheet className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">Revised_budget_v3.xlsx</p>
        <p className="text-[11px] text-ink-4">Attached by Amara · 2 min ago</p>
      </div>
    </div>
    <div className="flex items-center gap-2 rounded-xl bg-wash/70 px-3 py-2.5 text-[12px] text-ink-3 ring-1 ring-line">
      <Link2 className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">Link to the shared board pack</span>
    </div>
  </div>
);

const ReviewVisual = () => (
  <div className="rounded-2xl bg-wash/70 p-4 ring-1 ring-line">
    <p className="text-[12px] leading-relaxed text-ink-2">
      “Numbers check out. Please add the Q3 variance note before it goes to the board.”
    </p>
    <div className="mt-4 flex gap-2">
      <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 py-2 text-[12px] font-semibold text-rose-700">
        <CornerUpLeft className="h-3.5 w-3.5" /> Request Revision
      </span>
      <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-[12px] font-semibold text-white shadow-md shadow-emerald-600/20 transition-transform duration-300 group-hover:scale-[1.03]">
        <Check className="h-3.5 w-3.5" /> Approve
      </span>
    </div>
  </div>
);

const CopilotVisual = () => (
  <div className="space-y-2.5">
    <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[12px] text-white">
      How should I approach the venue booking?
    </div>
    <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-surface p-3.5 text-[12px] text-ink-2 ring-1 ring-line">
      <p className="flex items-center gap-1.5 font-medium text-brand-ink">
        <Sparkles className="h-3.5 w-3.5" /> Suggested plan
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 marker:text-ink-4">
        <li>Confirm headcount with partners</li>
        <li>Shortlist three venues near the office</li>
        <li>Request quotes by Oct 20</li>
      </ol>
    </div>
  </div>
);

const ReminderVisual = () => (
  <div className="relative pt-3">
    <div className="absolute inset-x-6 top-0 h-full rounded-2xl bg-surface/70 ring-1 ring-line" />
    <div className="relative rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line">
      <div className="flex items-center gap-2 text-[11px] text-ink-4">
        <Bell className="h-3.5 w-3.5 text-brand" /> Reminder · from your manager
      </div>
      <p className="mt-2 text-[13px] font-semibold">Due tomorrow: Send revised budget to Finance</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
        From the Programme review on Oct 9. Submit your proof when it’s done.
      </p>
      <span className="mt-3 inline-block rounded-lg bg-ink px-3 py-1.5 text-[11px] font-medium text-white">
        Open action item
      </span>
    </div>
  </div>
);

const ExportVisual = () => (
  <div className="relative h-40">
    {[2, 1, 0].map((n) => (
      <div
        key={n}
        className="absolute inset-x-0 mx-auto w-[80%]"
        style={{ top: `${(2 - n) * 14}px`, transform: `scale(${1 - n * 0.06})`, opacity: 1 - n * 0.3, zIndex: 3 - n }}
      >
        <div
          className="rounded-xl bg-night p-4 shadow-card ring-1 ring-night-line transition-transform duration-500 group-hover:-translate-y-1.5"
          style={{ transitionDelay: `${n * 50}ms` }}
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-400/15 px-1.5 py-px text-[9px] font-semibold text-amber-300">HIGH</span>
            <span className="ml-auto font-mono text-[9px] text-slate-500">Action 2 of 6</span>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-slate-100">Send revised budget to Finance</p>
          <div className="mt-2 h-px bg-night-line" />
          <div className="mt-2 flex gap-1.5">
            <span className="h-1.5 w-16 rounded-full bg-slate-700" />
            <span className="h-1.5 w-10 rounded-full bg-slate-800" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ─── Section ─────────────────────────────────────────────────────────────── */

export const Features: React.FC = () => (
  <section id="features" className="py-24 sm:py-32">
    <Container>
      <Reveal>
        <SectionHeading
          eyebrow="Product"
          title={
            <>
              Everything between <Accent>“we should”</Accent> and “it’s done”
            </>
          }
          lede="Purpose-built for follow-through. Not another notes app — a system of record for what your meetings decided."
        />
      </Reveal>

      <div className="mt-16 grid gap-4 lg:grid-cols-6">
        <Card
          className="lg:col-span-4"
          label="Meeting intelligence"
          title="AI that listens, so nobody has to take minutes"
          body="Get a full transcript with highlighted moments, a summary, and the decisions, risks and next steps — before everyone’s back at their desk."
        >
          <InsightsVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          delay={80}
          label="Ownership"
          title="Every task has a name on it"
          body="Owners, deadlines and priority — suggested by AI, adjusted by you."
        >
          <OwnersVisual />
        </Card>

        <Card
          className="lg:col-span-2"
          label="Proof of work"
          title="Proof, not promises"
          body="Owners attach files, links and notes to show the work is really done."
        >
          <ProofVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          delay={80}
          label="Review"
          title="Managers close the loop"
          body="Approve with one click, or send it back with feedback the owner can act on."
        >
          <ReviewVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          delay={160}
          label={COPILOT_NAME}
          title="A head start on every task"
          body="Ask the Copilot for a plan, research or a first draft for any action item."
        >
          <CopilotVisual />
        </Card>

        <Card
          className="lg:col-span-3"
          label="Reminders"
          title="Chasing, without the chasing"
          body="Participants get the meeting invite by email. Nudge any owner with a one-click email reminder, tracked on the task."
        >
          <ReminderVisual />
        </Card>
        <Card
          className="lg:col-span-3"
          delay={80}
          label="Export"
          title="Board-ready in one click"
          body="Export a meeting to PowerPoint — a cover, the summary, and one slide per action item with its owner and status."
        >
          <ExportVisual />
        </Card>
      </div>
    </Container>
  </section>
);
