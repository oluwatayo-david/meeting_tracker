import React from 'react';
import { CircleDashed, FileQuestion, UserX } from 'lucide-react';
import { APP_NAME } from '@synclog/brand';
import { TextReveal, type RevealWord } from './aceternity/text-reveal';
import { Reveal } from './reveal';
import { Container } from './ui';

const LEAKS = [
  {
    icon: FileQuestion,
    title: 'Notes nobody reads',
    body: 'Minutes land in a shared drive. The decisions inside them never make it onto anyone’s to-do list.',
  },
  {
    icon: UserX,
    title: 'Owners nobody named',
    body: '“Someone should follow up” means no one does. Without a name and a date, it isn’t a task.',
  },
  {
    icon: CircleDashed,
    title: '“Done” nobody checked',
    body: 'Work gets marked complete on trust. By the next meeting, nobody can say what actually happened.',
  },
];

const STATEMENT: RevealWord[] = [
  ...'Every meeting ends with decisions. Most of them quietly disappear somewhere between the call and the'
    .split(' ')
    .map((text) => ({ text })),
  { text: 'follow-up.', className: 'text-gradient font-serif text-[1.08em] font-normal italic tracking-[-0.01em] pr-1' },
];

export const Problem: React.FC = () => (
  <section className="py-24 sm:py-32">
    <Container>
      <TextReveal
        words={STATEMENT}
        className="mx-auto max-w-4xl text-balance text-center text-[1.75rem] font-semibold leading-[1.22] tracking-[-0.03em] text-ink sm:text-[2.5rem]"
      />

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-3">
        {LEAKS.map((leak, i) => (
          <div key={leak.title} className="group bg-surface p-7 transition-colors duration-300 hover:bg-wash/60 sm:p-8">
            <Reveal delay={i * 90}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-wash ring-1 ring-line transition-transform duration-300 group-hover:-translate-y-0.5">
                <leak.icon className="h-5 w-5 text-ink-4 transition-colors duration-300 group-hover:text-rose-500" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-5 text-[15px] font-semibold tracking-tight">{leak.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{leak.body}</p>
            </Reveal>
          </div>
        ))}
      </div>

      <Reveal className="mt-10 text-center text-[15px] text-ink-3">
        {APP_NAME} closes the loop — from the moment something is said to the moment it’s proven done.
      </Reveal>
    </Container>
  </section>
);
