import React from 'react';
import { LINKS } from '@/lib/site';
import { LampContainer } from './aceternity/lamp';
import { TextGenerateEffect, type GenerateWord } from './aceternity/text-generate-effect';
import { Reveal } from './reveal';
import { ButtonLink, Container } from './ui';

const HEADLINE: GenerateWord[] = [
  ...'Make your next meeting the one where'.split(' ').map((text) => ({ text })),
  { text: 'everything', className: 'font-serif text-[1.08em] font-normal italic tracking-[-0.01em] text-sky-200 pr-1' },
  { text: 'gets' },
  { text: 'done.' },
];

export const Cta: React.FC = () => (
  <section className="pb-24 sm:pb-32">
    <Container>
      <Reveal className="overflow-hidden rounded-[2rem] ring-1 ring-night-line">
        {/* Aceternity Lamp */}
        <LampContainer className="pb-20 sm:pb-24">
          <TextGenerateEffect
            as="h2"
            words={HEADLINE}
            staggerBy={0.07}
            className="mx-auto max-w-2xl text-balance text-center text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-[3.25rem]"
          />
          <p className="mx-auto mt-5 max-w-lg text-pretty text-center text-[17px] leading-relaxed text-slate-400">
            Set up your workspace in minutes. Record your first meeting today and let the follow-through take care of itself.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={LINKS.getStarted} variant="inverse" size="lg" arrow>
              Get started
            </ButtonLink>
            <ButtonLink href={LINKS.signIn} variant="ghost-dark" size="lg">
              Sign in
            </ButtonLink>
          </div>
        </LampContainer>
      </Reveal>
    </Container>
  </section>
);
