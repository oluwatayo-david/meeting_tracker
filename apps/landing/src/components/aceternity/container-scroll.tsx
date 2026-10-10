'use client';

/*
 * Aceternity UI — Container Scroll Animation (adapted).
 * The product window starts tilted back in 3D and settles flat as it scrolls
 * into view. Progress is spring-smoothed and tracked against the card itself,
 * so it works below a hero headline rather than owning the whole viewport.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

export const ContainerScroll: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 0 when the card's top enters the bottom of the viewport, 1 when it reaches 20% from the top.
  const { scrollYProgress } = useScroll({ target: ref, offset: [[0, 1], [0, 0.2]] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 });

  const rotate = useTransform(progress, [0, 1], reduce ? [0, 0] : [isMobile ? 12 : 22, 0]);
  const scale = useTransform(progress, [0, 1], reduce ? [1, 1] : isMobile ? [0.94, 1] : [1.05, 1]);
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [40, 0]);

  return (
    <div ref={ref} className={cn('relative', className)} style={{ perspective: '1200px' }}>
      <motion.div
        style={{
          rotateX: rotate,
          scale,
          y,
          transformOrigin: 'center top',
          boxShadow:
            '0 0 #0000004d, 0 9px 20px #0b12201f, 0 37px 37px #0b12201a, 0 84px 50px #0b122012, 0 149px 60px #0b122008, 0 233px 65px #0b122003',
        }}
        className="mx-auto w-full rounded-[22px] bg-gradient-to-b from-[#1b2335] to-night p-1.5 ring-1 ring-white/10 sm:rounded-[28px] sm:p-2.5"
      >
        <div className="overflow-hidden rounded-[16px] bg-slate-50 ring-1 ring-black/40 sm:rounded-[20px]">{children}</div>
      </motion.div>
    </div>
  );
};
