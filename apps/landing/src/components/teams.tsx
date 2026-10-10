'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Briefcase, ShieldCheck, User } from 'lucide-react';
import { APP_NAME } from '@synclog/brand';
import { ActionBoardContent, AdminRosterContent, MY_TASKS, ReviewPortalContent } from './screens/app-views';
import { AppFrame, ScaledScreen, USERS } from './screens/primitives';
import { Reveal } from './reveal';
import { Accent, Container, SectionHeading, cn } from './ui';

type RoleId = 'staff' | 'managers' | 'admins';

const ROLES: {
  id: RoleId;
  label: string;
  icon: React.ElementType;
  headline: string;
  points: string[];
  screenLabel: string;
  screen: React.ReactNode;
}[] = [
  {
    id: 'staff',
    label: 'Staff',
    icon: User,
    headline: 'Know exactly what’s yours — and get credit for finishing it.',
    points: [
      'One board with every action assigned to you, across every meeting',
      'Deadlines and priorities that are clear from day one',
      'Copilot to plan, research and draft your next step',
      'Submit proof and see when it’s been approved',
    ],
    screenLabel: `${APP_NAME} for staff: the My Tasks board`,
    screen: (
      <AppFrame user={USERS.staff} active="actions" counts={{ meetings: 6, open: 0, mine: 2, reviews: 0, urgent: 1 }}>
        <ActionBoardContent items={MY_TASKS} mine viewer="STAFF" />
      </AppFrame>
    ),
  },
  {
    id: 'managers',
    label: 'Managers',
    icon: Briefcase,
    headline: 'See what’s moving, what’s stuck, and what’s really done.',
    points: [
      'A review queue of submitted proof, ready to approve or send back',
      'Overdue and urgent work surfaced before it becomes a problem',
      'One-click email reminders, tracked on each task',
      'An audit trail of every submission and review decision',
    ],
    screenLabel: `${APP_NAME} for managers: the verification portal`,
    screen: (
      <AppFrame user={USERS.manager} active="manager" counts={{ meetings: 14, open: 8, mine: 3, reviews: 3, urgent: 2 }}>
        <ReviewPortalContent animated={false} />
      </AppFrame>
    ),
  },
  {
    id: 'admins',
    label: 'Admins',
    icon: ShieldCheck,
    headline: 'Run the whole organisation from one place.',
    points: [
      'Invite staff with a temporary password they must change on first sign-in',
      'Set roles and departments for everyone',
      'Deactivate an account and its access ends immediately',
      'Organisation-wide view of meetings and follow-through',
    ],
    screenLabel: `${APP_NAME} for admins: team and role administration`,
    screen: (
      <AppFrame user={USERS.admin} active="admin" counts={{ meetings: 41, open: 19, mine: 0, reviews: 5, urgent: 4 }}>
        <AdminRosterContent />
      </AppFrame>
    ),
  },
];

export const Teams: React.FC = () => {
  const [active, setActive] = useState<RoleId>('staff');
  const role = ROLES.find((r) => r.id === active)!;

  return (
    <section id="teams" className="border-y border-line bg-surface py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Built for every role"
            title={
              <>
                One source of truth, <Accent>three</Accent> points of view
              </>
            }
            lede="Staff, managers and admins each get a workspace shaped around what they need to do next."
          />
        </Reveal>

        <Reveal className="mt-12 flex justify-center">
          <div role="tablist" aria-label="Roles" className="inline-flex rounded-full bg-wash p-1 ring-1 ring-line">
            {ROLES.map((r) => {
              const isActive = active === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  id={`tab-${r.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${r.id}`}
                  onClick={() => setActive(r.id)}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-brand sm:px-5',
                    isActive ? 'text-ink' : 'text-ink-3 hover:text-ink'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="teams-tab"
                      className="absolute inset-0 rounded-full bg-surface shadow-card ring-1 ring-line"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <r.icon className="relative h-4 w-4" aria-hidden />
                  <span className="relative">{r.label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div role="tabpanel" id={`panel-${role.id}`} aria-labelledby={`tab-${role.id}`} className="mt-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                <h3 className="text-balance text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem]">{role.headline}</h3>
                <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {role.points.map((p, i) => (
                    <motion.li
                      key={p}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                      className="flex gap-3 text-[15px] leading-relaxed text-ink-2"
                    >
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-brand to-brand-2" />
                      {p}
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="relative mt-12">
                <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 rounded-[3rem] bg-gradient-to-br from-sky-100 via-wash to-indigo-100 blur-2xl" />
                <div className="relative rounded-[1.4rem] bg-gradient-to-b from-white to-wash p-1.5 shadow-float ring-1 ring-line sm:p-2">
                  <div className="overflow-hidden rounded-2xl ring-1 ring-ink/10">
                    <ScaledScreen width={1280} height={800} compactWidth={760} compactHeight={1080} label={role.screenLabel}>
                      {role.screen}
                    </ScaledScreen>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
};
