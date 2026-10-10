'use client';

/*
 * Aceternity UI — Text Generate Effect (adapted).
 * Words resolve out of a blur one after another. Words can carry their own
 * classes (gradient, serif accent) and `null` forces a line break. Before JS
 * runs the text is fully visible (see `html.js .tge-word` in globals.css).
 */

import React, { useEffect } from 'react';
import { stagger, useAnimate, useInView, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export type GenerateWord = { text: string; className?: string } | null;

export const TextGenerateEffect: React.FC<{
  words: string | GenerateWord[];
  className?: string;
  wordClassName?: string;
  duration?: number;
  staggerBy?: number;
  delay?: number;
  as?: 'h1' | 'h2' | 'p' | 'span';
}> = ({ words, className, wordClassName, duration = 0.7, staggerBy = 0.12, delay = 0, as: Tag = 'span' }) => {
  const [scope, animate] = useAnimate();
  const inView = useInView(scope, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();

  const list: GenerateWord[] =
    typeof words === 'string' ? words.split(' ').map((text) => ({ text })) : words;

  useEffect(() => {
    if (!inView) return;
    animate(
      '.tge-word',
      { opacity: 1, filter: 'blur(0px)', y: 0 },
      reduce ? { duration: 0 } : { duration, delay: stagger(staggerBy, { startDelay: delay }), ease: [0.2, 0.65, 0.3, 0.9] }
    );
  }, [inView, animate, duration, staggerBy, delay, reduce]);

  return (
    <Tag ref={scope} className={className}>
      {list.map((word, i) =>
        word === null ? (
          <br key={`br-${i}`} />
        ) : (
          <React.Fragment key={`${word.text}-${i}`}>
            <span className={cn('tge-word inline-block', wordClassName, word.className)}>{word.text}</span>{' '}
          </React.Fragment>
        )
      )}
    </Tag>
  );
};
