import React from 'react';
import { ArrowRight } from 'lucide-react';
import { APP_NAME } from '@synclog/brand';
import { LINKS } from '@/lib/site';
import { ContainerScroll } from './aceternity/container-scroll';
import { Marquee } from './aceternity/marquee';
import { TextGenerateEffect, type GenerateWord } from './aceternity/text-generate-effect';
import { OverviewContent } from './screens/app-views';
import { USERS } from './screens/data';
import { AppFrame, ScaledScreen } from './screens/primitives';
import { ButtonLink, Container } from './ui';

const AUDIENCES = ['Programme teams', 'Operations', 'Finance', 'Leadership', 'Research', 'Field teams', 'Partnerships', 'M&E'];

const HEADLINE: GenerateWord[] = [
  { text: 'Meetings' },
  { text: 'end.' },
  null,
  { text: 'Accountability', className: 'text-gradient' },
  { text: 'doesn’t.', className: 'text-gradient font-serif text-[1.08em] font-normal italic tracking-[-0.01em] pr-2' },
];

export const Hero: React.FC = () => (
  <section id="top" className="relative isolate overflow-hidden pt-32 sm:pt-40">
    {/* backdrop: faded grid + top glow */}
    <div className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black_30%,transparent_75%)]" />
    <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-100/80 to-transparent blur-3xl" />

    <Container className="text-center">
      <a
        href="#how-it-works"
        className="animate-rise group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-surface/80 py-1 pl-1 pr-3 text-[13px] text-ink-2 shadow-card ring-1 ring-line backdrop-blur"
      >
        <span className="shimmer pointer-events-none absolute inset-0" />
        <span className="relative rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">New</span>
        <span className="relative">AI action extraction from live recordings</span>
        <ArrowRight className="relative h-3.5 w-3.5 text-ink-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </a>

      <TextGenerateEffect
        as="h1"
        words={HEADLINE}
        delay={0.15}
        staggerBy={0.14}
        duration={0.8}
        className="mx-auto mt-7 max-w-4xl text-balance text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-[4.25rem] lg:text-[5rem]"
      />

      <p
        className="animate-rise mx-auto mt-7 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-3 sm:text-lg"
        style={{ animationDelay: '700ms' }}
      >
        Record the meeting. AI turns every decision into an action item with an owner and a deadline. Your team submits proof,
        managers verify it — and nothing quietly slips.
      </p>

      <div
        className="animate-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        style={{ animationDelay: '850ms' }}
      >
        <ButtonLink href={LINKS.getStarted} size="lg" arrow>
          Get started
        </ButtonLink>
        <ButtonLink href="#how-it-works" size="lg" variant="secondary">
          See how it works
        </ButtonLink>
      </div>
    </Container>

    {/* Product: the real dashboard, tilting flat as you scroll (Aceternity Container Scroll) */}
    <Container className="mt-16 sm:mt-20">
      <div className="animate-rise relative mx-auto max-w-5xl" style={{ animationDelay: '1000ms' }}>
        <div className="pointer-events-none absolute -inset-x-16 -top-10 bottom-10 -z-10 rounded-[4rem] bg-gradient-to-tr from-sky-200/60 via-indigo-200/40 to-transparent blur-3xl" />
        <ContainerScroll>
          <ScaledScreen
            width={1280}
            height={900}
            compactWidth={760}
            compactHeight={1180}
            label={`The ${APP_NAME} dashboard: verification rate, deliverables awaiting sign-off, recent meetings and urgent tasks`}
          >
            <AppFrame
              user={USERS.manager}
              active="overview"
              counts={{ meetings: 14, open: 8, mine: 3, reviews: 3, urgent: 2 }}
            >
              <OverviewContent />
            </AppFrame>
          </ScaledScreen>
        </ContainerScroll>
      </div>
    </Container>

    {/* who it's for */}
    <Container className="mt-16 pb-6 sm:mt-24">
      <p className="text-center text-[13px] text-ink-4">Built for every team whose meetings create work</p>
      <Marquee
        className="mx-auto mt-5 max-w-3xl"
        duration={32}
        items={AUDIENCES.map((a) => (
          <span key={a} className="text-[15px] font-medium tracking-tight text-ink-3/80">
            {a}
          </span>
        ))}
      />
    </Container>
  </section>
);
