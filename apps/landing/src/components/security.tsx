import React from 'react';
import { Database, Globe2, KeyRound, ScrollText, UserX, Users } from 'lucide-react';
import { BackgroundBeams } from './aceternity/background-beams';
import { Reveal } from './reveal';
import { Accent, Container, SectionHeading } from './ui';

const ITEMS = [
  {
    icon: Database,
    title: 'Row-level security',
    body: 'Access rules are enforced inside the database itself, so people only see the meetings and tasks they’re part of.',
  },
  {
    icon: Users,
    title: 'Role-based permissions',
    body: 'Admin, manager and staff roles decide who can create, review and approve. Roles are set server-side, never by the user.',
  },
  {
    icon: ScrollText,
    title: 'Audit trail',
    body: 'Every proof submission and every approval or rejection is recorded with who did it, when, and why.',
  },
  {
    icon: Globe2,
    title: 'Internal vs. external meetings',
    body: 'Keep internal meetings to invited staff. Bring partners into external meetings by email — approval stays with your managers.',
  },
  {
    icon: UserX,
    title: 'Instant deactivation',
    body: 'When someone leaves, deactivating them blocks new sign-ins and ends their active sessions.',
  },
  {
    icon: KeyRound,
    title: 'Secure onboarding',
    body: 'Invited staff must replace their temporary password before they can see anything.',
  },
];

export const Security: React.FC = () => (
  <section id="security" className="relative isolate overflow-hidden bg-night py-24 text-white sm:py-32">
    {/* Aceternity Background Beams */}
    <BackgroundBeams className="-z-10 opacity-80" />
    <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-transparent blur-3xl" />

    <Container>
      <Reveal>
        <SectionHeading
          tone="dark"
          eyebrow="Security & control"
          title={
            <>
              Your meetings are <Accent>private</Accent> by default
            </>
          }
          lede="What’s said in a meeting can be sensitive. Access control is built into every layer, not bolted on."
        />
      </Reveal>

      <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-night-line/80 ring-1 ring-night-line backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item, i) => (
          <div key={item.title} className="group relative bg-night-2/90 p-7 transition-colors duration-500 hover:bg-[#121a2c]/95 sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/0 to-transparent transition-all duration-500 group-hover:via-sky-400/60" />
            <Reveal delay={(i % 3) * 80}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] ring-1 ring-white/10 transition-all duration-500 group-hover:bg-sky-400/10 group-hover:ring-sky-400/30">
                <item.icon className="h-[18px] w-[18px] text-sky-300" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-white">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{item.body}</p>
            </Reveal>
          </div>
        ))}
      </div>
    </Container>
  </section>
);
