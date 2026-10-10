'use client';

/*
 * Aceternity UI — Glowing Effect (adapted).
 * A gradient border segment follows the pointer around the card's edge.
 * Gradient re-coloured to the brand (sky, indigo, violet, cyan).
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { animate } from 'motion/react';
import { cn } from '@/lib/utils';

interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
}

const GRADIENT = `radial-gradient(circle, #38bdf8 10%, #38bdf800 20%),
  radial-gradient(circle at 40% 40%, #818cf8 5%, #818cf800 15%),
  radial-gradient(circle at 60% 60%, #22d3ee 10%, #22d3ee00 20%),
  radial-gradient(circle at 40% 60%, #6366f1 10%, #6366f100 20%),
  repeating-conic-gradient(from 236.84deg at 50% 50%,
    #38bdf8 0%,
    #818cf8 calc(25% / var(--repeating-conic-gradient-times)),
    #22d3ee calc(50% / var(--repeating-conic-gradient-times)),
    #6366f1 calc(75% / var(--repeating-conic-gradient-times)),
    #38bdf8 calc(100% / var(--repeating-conic-gradient-times)))`;

export const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = true,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const frame = useRef<number>(0);

    const handleMove = useCallback(
      (e?: { x: number; y: number }) => {
        if (!containerRef.current) return;
        if (frame.current) cancelAnimationFrame(frame.current);

        frame.current = requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;
          const { left, top, width, height } = el.getBoundingClientRect();
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;
          if (e) lastPosition.current = { x: mouseX, y: mouseY };

          const center = [left + width * 0.5, top + height * 0.5];
          const distance = Math.hypot(mouseX - center[0], mouseY - center[1]);
          if (distance < 0.5 * Math.min(width, height) * inactiveZone) {
            el.style.setProperty('--active', '0');
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;
          el.style.setProperty('--active', isActive ? '1' : '0');
          if (!isActive) return;

          const current = parseFloat(el.style.getPropertyValue('--start')) || 0;
          const target = (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;
          const diff = ((target - current + 180) % 360) - 180;

          animate(current, current + diff, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => el.style.setProperty('--start', String(v)),
          });
        });
      },
      [inactiveZone, proximity, movementDuration]
    );

    useEffect(() => {
      if (disabled) return;
      const onScroll = () => handleMove();
      const onPointer = (e: PointerEvent) => handleMove(e);
      window.addEventListener('scroll', onScroll, { passive: true });
      document.body.addEventListener('pointermove', onPointer, { passive: true });
      return () => {
        if (frame.current) cancelAnimationFrame(frame.current);
        window.removeEventListener('scroll', onScroll);
        document.body.removeEventListener('pointermove', onPointer);
      };
    }, [handleMove, disabled]);

    return (
      <>
        <div
          className={cn(
            'pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity',
            glow && 'opacity-100',
            disabled && '!block'
          )}
        />
        <div
          ref={containerRef}
          style={
            {
              '--blur': `${blur}px`,
              '--spread': spread,
              '--start': '0',
              '--active': '0',
              '--glowingeffect-border-width': `${borderWidth}px`,
              '--repeating-conic-gradient-times': '5',
              '--gradient': GRADIENT,
            } as React.CSSProperties
          }
          className={cn(
            'pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity',
            glow && 'opacity-100',
            blur > 0 && 'blur-[var(--blur)]',
            className,
            disabled && '!hidden'
          )}
        >
          <div
            className={cn(
              'glow rounded-[inherit]',
              'after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))] after:rounded-[inherit] after:content-[""]',
              'after:[border:var(--glowingeffect-border-width)_solid_transparent]',
              'after:[background:var(--gradient)] after:[background-attachment:fixed]',
              'after:opacity-[var(--active)] after:transition-opacity after:duration-300',
              'after:[mask-clip:padding-box,border-box]',
              'after:[mask-composite:intersect]',
              'after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]'
            )}
          />
        </div>
      </>
    );
  }
);

GlowingEffect.displayName = 'GlowingEffect';
