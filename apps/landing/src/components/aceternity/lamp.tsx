'use client';

/*
 * Aceternity UI — Lamp (adapted).
 * Two conic light cones open outwards from a glowing bar when the block
 * scrolls into view. Rewritten with explicit conic gradients (Tailwind v4 has
 * no bg-gradient-conic) in the brand's sky/indigo, sized to sit inside a card.
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const BG = '#070b14'; // --color-night
const ease = [0.25, 0.1, 0.25, 1] as const;
const grow = { initial: { opacity: 0.5, width: '15rem' }, whileInView: { opacity: 1, width: '30rem' } };
const transition = { delay: 0.2, duration: 0.9, ease };

export const LampContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('relative isolate z-0 flex w-full flex-col items-center overflow-hidden', className)} style={{ background: BG }}>
    {/* Scaled down on phones so the cones keep their lamp shape instead of filling the card. */}
    <div className="relative isolate z-0 mt-10 flex h-[19rem] w-full origin-top sm:mt-20 scale-x-[0.55] scale-y-[0.7] items-center justify-center sm:scale-x-100 sm:scale-y-125" aria-hidden>
      <motion.div
        {...grow}
        viewport={{ once: true }}
        transition={transition}
        style={{ backgroundImage: 'conic-gradient(from 70deg at center top, #38bdf8, transparent, transparent)' }}
        className="absolute inset-auto right-1/2 h-56 overflow-visible"
      >
        <div className="absolute bottom-0 left-0 z-20 h-40 w-full [mask-image:linear-gradient(to_top,white,transparent)]" style={{ background: BG }} />
        <div className="absolute bottom-0 left-0 z-20 h-full w-40 [mask-image:linear-gradient(to_right,white,transparent)]" style={{ background: BG }} />
      </motion.div>
      <motion.div
        {...grow}
        viewport={{ once: true }}
        transition={transition}
        style={{ backgroundImage: 'conic-gradient(from 290deg at center top, transparent, transparent, #38bdf8)' }}
        className="absolute inset-auto left-1/2 h-56"
      >
        <div className="absolute bottom-0 right-0 z-20 h-full w-40 [mask-image:linear-gradient(to_left,white,transparent)]" style={{ background: BG }} />
        <div className="absolute bottom-0 right-0 z-20 h-40 w-full [mask-image:linear-gradient(to_top,white,transparent)]" style={{ background: BG }} />
      </motion.div>
      <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 blur-2xl" style={{ background: BG }} />
      <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
      <div className="absolute inset-auto z-50 h-36 w-[28rem] max-w-full -translate-y-1/2 rounded-full bg-sky-500 opacity-40 blur-3xl" />
      <motion.div
        initial={{ width: '8rem' }}
        whileInView={{ width: '16rem' }}
        viewport={{ once: true }}
        transition={transition}
        className="absolute inset-auto z-30 h-36 -translate-y-[6rem] rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 blur-2xl"
      />
      <motion.div
        initial={{ width: '15rem' }}
        whileInView={{ width: '30rem' }}
        viewport={{ once: true }}
        transition={transition}
        className="absolute inset-auto z-50 h-0.5 max-w-full -translate-y-[7rem] bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-400"
      />
      <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem]" style={{ background: BG }} />
    </div>

    <div className="relative z-50 -mt-40 flex sm:-mt-32 flex-col items-center px-5">{children}</div>
  </div>
);
