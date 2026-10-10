'use client';

/*
 * Scroll-linked text reveal (Aceternity-style).
 * Each word brightens from faint to full as the paragraph scrolls through
 * the middle of the viewport, so the sentence "reads itself" to the visitor.
 */

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { cn } from '@/lib/utils';

export type RevealWord = { text: string; className?: string };

const Word: React.FC<{ word: RevealWord; progress: MotionValue<number>; range: [number, number] }> = ({
  word,
  progress,
  range,
}) => {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [6, 0]);
  return (
    <motion.span style={{ opacity, y }} className={cn('inline-block', word.className)}>
      {word.text}
    </motion.span>
  );
};

export const TextReveal: React.FC<{ words: RevealWord[]; className?: string }> = ({ words, className }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.5'] });

  if (reduce) {
    return (
      <p className={className}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span className={w.className}>{w.text}</span>{' '}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => {
        const start = i / words.length;
        return (
          <React.Fragment key={i}>
            <Word word={w} progress={scrollYProgress} range={[start, start + 1 / words.length]} />{' '}
          </React.Fragment>
        );
      })}
    </p>
  );
};
