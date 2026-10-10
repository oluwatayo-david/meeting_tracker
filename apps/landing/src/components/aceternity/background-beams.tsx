'use client';

/*
 * Aceternity UI — Background Beams (adapted).
 * Curved light beams drift across the section. Colours follow the brand
 * (sky → indigo) and the per-beam timing is seeded instead of Math.random(),
 * so server and client markup match.
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn, seeded } from '@/lib/utils';

const paths = Array.from({ length: 50 }, (_, i) => {
  const x = -380 + i * 7;
  const y = -189 - i * 8;
  return `M${x} ${y}C${x} ${y} ${x + 68} ${y + 405} ${x + 532} ${y + 532}C${x + 996} ${y + 659} ${x + 1064} ${y + 1064} ${x + 1064} ${y + 1064}`;
});

export const BackgroundBeams = React.memo(({ className }: { className?: string }) => (
  <div className={cn('pointer-events-none absolute inset-0 flex h-full w-full items-center justify-center', className)}>
    <svg
      className="absolute z-0 h-full w-full"
      width="100%"
      height="100%"
      viewBox="0 0 696 316"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d={paths.join('')} stroke="url(#beams-base)" strokeOpacity="0.06" strokeWidth="0.5" />
      {paths.map((d, i) => (
        <path key={i} d={d} stroke={`url(#beam-${i})`} strokeOpacity="0.5" strokeWidth="0.5" />
      ))}
      <defs>
        {paths.map((_, i) => (
          <motion.linearGradient
            id={`beam-${i}`}
            key={i}
            initial={{ x1: '0%', x2: '0%', y1: '0%', y2: '0%' }}
            animate={{ x1: ['0%', '100%'], x2: ['0%', '95%'], y1: ['0%', '100%'], y2: ['0%', `${93 + seeded(i) * 8}%`] }}
            transition={{ duration: seeded(i + 100) * 10 + 10, ease: 'easeInOut', repeat: Infinity, delay: seeded(i + 200) * 10 }}
          >
            <stop stopColor="#38BDF8" stopOpacity="0" />
            <stop stopColor="#38BDF8" />
            <stop offset="32.5%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
          </motion.linearGradient>
        ))}
        <radialGradient
          id="beams-base"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)"
        >
          <stop offset="0.0666667" stopColor="#94a3b8" />
          <stop offset="0.243243" stopColor="#94a3b8" />
          <stop offset="0.43594" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  </div>
));

BackgroundBeams.displayName = 'BackgroundBeams';
