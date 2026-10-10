'use client';

/*
 * Aceternity UI — Sticky Scroll Reveal (adapted) + Tracing Beam rail.
 * Steps scroll on the left while the matching product screen stays pinned on
 * the right and cross-fades as each step takes focus. Tracks page scroll
 * (target mode) instead of an inner scroll box. Below `lg` each step simply
 * shows its screen inline.
 */

import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { cn } from '@/lib/utils';

export type StickyStep = {
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
};

export const StickyScroll: React.FC<{ content: StickyStep[]; className?: string }> = ({ content, className }) => {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.55', 'end 0.6'] });
  const beam = useSpring(scrollYProgress, { stiffness: 220, damping: 40 });
  const beamHeight = useTransform(beam, [0, 1], ['0%', '100%']);

  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Active step = the one whose centre is closest to the middle of the viewport.
  useMotionValueEvent(scrollYProgress, 'change', () => {
    const mid = window.innerHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    stepRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  });

  return (
    <div ref={ref} className={cn('relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16', className)}>
      {/* Steps + tracing beam */}
      <div className="relative">
        <div aria-hidden className="absolute bottom-6 left-[19px] top-6 hidden w-px bg-line lg:block">
          <motion.div
            style={{ height: beamHeight }}
            className="w-px bg-gradient-to-b from-sky-400 via-brand to-brand-2 shadow-[0_0_12px_rgb(2_132_199/0.6)]"
          />
        </div>

        <ol>
          {content.map((step, i) => {
            const isActive = active === i;
            return (
              <li
                key={step.title}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="relative py-10 first:pt-0 last:pb-0 lg:flex lg:min-h-[64vh] lg:items-center lg:py-0">
                <div className="flex gap-5">
                  <motion.span
                    animate={{
                      scale: isActive ? 1 : 0.92,
                      boxShadow: isActive ? '0 8px 24px -6px rgb(2 132 199 / 0.45)' : '0 1px 2px rgb(11 18 32 / 0.04)',
                    }}
                    className={cn(
                      'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 transition-colors duration-500',
                      isActive ? 'bg-gradient-to-br from-brand to-brand-2 text-white ring-white/20' : 'bg-surface text-ink-4 ring-line'
                    )}
                  >
                    <step.icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                  </motion.span>
                  <motion.div animate={{ opacity: isActive ? 1 : 0.38 }} transition={{ duration: 0.4 }} className="lg:max-w-sm">
                    <p className="font-mono text-[11px] text-ink-4">Step 0{i + 1}</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">{step.title}</h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-ink-3">{step.description}</p>
                  </motion.div>
                </div>
                {/* inline screen on small screens */}
                <div className="mt-8 lg:hidden">{step.content}</div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Pinned screen */}
      <div className="hidden lg:block">
        <div className="sticky top-[max(6.5rem,calc(50vh-17rem))]">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-tr from-sky-200/50 via-indigo-200/30 to-transparent blur-3xl" />
            {/* Keyed remount: each step's screen resolves in from a soft blur. */}
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)', scale: 0.985 }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {content[active].content}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
