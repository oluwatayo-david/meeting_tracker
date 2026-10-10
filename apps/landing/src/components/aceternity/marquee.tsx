import React from 'react';
import { cn } from '@/lib/utils';

/*
 * Infinite moving strip (Aceternity "Infinite Moving Cards" pattern, CSS only).
 * The list is rendered twice and translated by half its width, with faded
 * edges. Pauses on hover; reduced-motion users get a static list.
 */
export const Marquee: React.FC<{ items: React.ReactNode[]; className?: string; duration?: number }> = ({
  items,
  className,
  duration = 40,
}) => (
  <div
    className={cn(
      'group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]',
      className
    )}
  >
    <ul
      className="marquee-track flex w-max items-center gap-12 group-hover:[animation-play-state:paused]"
      style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}
    >
      {[...items, ...items].map((item, i) => (
        <li key={i} aria-hidden={i >= items.length || undefined} className="shrink-0">
          {item}
        </li>
      ))}
    </ul>
  </div>
);
