'use client';

import React from 'react';
import { BadgeCheck, Mic, Paperclip, Sparkles, UserCheck } from 'lucide-react';
import { StickyScroll, type StickyStep } from './aceternity/sticky-scroll-reveal';
import { ActionBoardContent, ReviewPortalContent, TEAM_TASKS } from './screens/app-views';
import { RecordingScreen, SubmitProofScreen, TranscriptScreen } from './screens/meeting-views';
import { ScaledScreen } from './screens/primitives';
import { Reveal } from './reveal';
import { Accent, Container, SectionHeading, cn } from './ui';

/** A cropped region of the app, framed like a product shot. */
const Shot: React.FC<{ children: React.ReactNode; light?: boolean; className?: string }> = ({ children, light, className }) => (
  <div className={cn('overflow-hidden rounded-2xl shadow-float ring-1 ring-ink/10', light && 'bg-slate-50', className)}>{children}</div>
);

const STEPS: StickyStep[] = [
  {
    icon: Mic,
    title: 'Record',
    description: 'Hit record in the browser — no bots joining your call, no extra apps. Speech is transcribed live as people talk.',
    content: (
      <Shot>
        <ScaledScreen width={760} height={600} label="Live recording with real-time speech transcription">
          <RecordingScreen />
        </ScaledScreen>
      </Shot>
    ),
  },
  {
    icon: Sparkles,
    title: 'Extract',
    description: 'AI writes the summary, flags the key moments and pulls out every action item — with who said they’d do it.',
    content: (
      <Shot>
        <ScaledScreen width={760} height={780} label="AI meeting summary, highlights and extracted action points">
          <TranscriptScreen />
        </ScaledScreen>
      </Shot>
    ),
  },
  {
    icon: UserCheck,
    title: 'Assign',
    description: 'Each action lands on the owner’s board with a deadline and a priority. Managers can nudge with one-click reminders.',
    content: (
      <Shot light>
        <ScaledScreen width={880} height={660} label="Action board with owners, due dates and priorities">
          <div className="h-full bg-slate-50 p-7">
            <ActionBoardContent items={TEAM_TASKS} viewer="MANAGER" />
          </div>
        </ScaledScreen>
      </Shot>
    ),
  },
  {
    icon: Paperclip,
    title: 'Prove',
    description: 'When the work is done, the owner attaches evidence — notes, a file, a link — and sends it for sign-off.',
    content: (
      <div className="mx-auto max-w-[520px]">
        <Shot>
          <ScaledScreen width={640} height={690} label="Submitting proof of work for manager sign-off">
            <SubmitProofScreen />
          </ScaledScreen>
        </Shot>
      </div>
    ),
  },
  {
    icon: BadgeCheck,
    title: 'Verify',
    description: 'Managers inspect the evidence and approve it, or send it back with feedback. Every decision joins the audit trail.',
    content: (
      <Shot light>
        <ScaledScreen width={880} height={620} label="Manager verification portal approving a deliverable">
          <div className="h-full bg-slate-50 p-7">
            <ReviewPortalContent />
          </div>
        </ScaledScreen>
      </Shot>
    ),
  },
];

export const HowItWorks: React.FC = () => (
  <section id="how-it-works" className="relative border-y border-line bg-surface py-24 sm:py-32">
    <div className="bg-dots pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    <Container className="relative">
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From spoken to <Accent>signed off</Accent> in five steps
            </>
          }
          lede="One continuous workflow replaces the meeting notes, the follow-up email, the spreadsheet tracker and the status-chasing."
        />
      </Reveal>

      <StickyScroll content={STEPS} className="mt-20" />
    </Container>
  </section>
);
