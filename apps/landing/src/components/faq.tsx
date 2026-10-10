'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { APP_NAME, COPILOT_NAME } from '@synclog/brand';
import { Reveal } from './reveal';
import { Container, SectionHeading, cn } from './ui';

const FAQS = [
  {
    q: 'Does a bot need to join our calls?',
    a: 'No. You record straight from the browser, so it works for video calls and in-person meetings alike — just keep a laptop in the room.',
  },
  {
    q: 'Can we edit what the AI extracts?',
    a: 'Always. Review the suggested action items before saving them: rewrite them, change the owner or deadline, set the priority, or add ones the AI missed.',
  },
  {
    q: 'Who can see a meeting?',
    a: 'Internal meetings are visible only to the people invited, the organiser, and the managers and admins responsible for them. Access is enforced by row-level security in the database, not just hidden in the interface.',
  },
  {
    q: 'How do external partners take part?',
    a: 'Mark a meeting as external and add partners by email — they receive the invitation with the meeting details. Reviewing and approving work stays with your internal managers.',
  },
  {
    q: `What does ${COPILOT_NAME} do?`,
    a: 'It’s an AI assistant attached to every action item. Ask it for a plan of attack, background research or a first draft, and it answers with the task’s context already in mind.',
  },
  {
    q: 'How does my team get access?',
    a: 'People can create an account themselves, or an admin can invite them with a temporary password that must be changed on first sign-in. Admins control roles and departments.',
  },
  {
    q: `Can we share results outside ${APP_NAME}?`,
    a: 'Yes. Export any meeting to a PowerPoint deck with the summary and one slide per action item — ready for a board pack or a partner update.',
  },
];

export const Faq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 sm:py-32">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title="Questions, answered"
            lede="Can’t find what you’re looking for? Ask your workspace admin — they can help with access, roles and setup."
          />
        </Reveal>

        <Reveal className="divide-y divide-line border-y border-line">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="py-1">
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-6 rounded-md py-5 text-left text-[16px] font-medium tracking-tight text-ink transition-colors hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {item.q}
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-300',
                        isOpen ? 'bg-ink text-white ring-ink' : 'text-ink-3 ring-line-2'
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-a-${i}`}
                      role="region"
                      aria-labelledby={`faq-q-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="-mt-1 max-w-xl pb-6 pr-12 text-[15px] leading-relaxed text-ink-3">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </Container>
    </section>
  );
};
