'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { APP_NAME } from '@synclog/brand';
import { BrandMark } from '@synclog/brand/mark';
import { LINKS, NAV } from '@/lib/site';
import { ButtonLink, cn } from './ui';

/*
 * Aceternity-style resizable navbar: full-width and transparent at the top,
 * it tucks into a floating, blurred pill once the page scrolls. Links get a
 * sliding hover highlight (shared layoutId).
 */
export const Nav: React.FC = () => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4">
      <motion.nav
        aria-label="Main"
        initial={false}
        animate={
          scrolled && !open
            ? { maxWidth: 940, y: 12, borderRadius: 999, paddingLeft: 10, paddingRight: 10 }
            : { maxWidth: 1152, y: 0, borderRadius: 0, paddingLeft: 20, paddingRight: 20 }
        }
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        className={cn(
          'mx-auto flex h-16 items-center justify-between transition-[background-color,box-shadow,backdrop-filter] duration-300',
          scrolled || open
            ? 'bg-paper/75 shadow-[0_1px_0_rgb(11_18_32/0.04),0_12px_32px_-12px_rgb(11_18_32/0.18)] ring-1 ring-line/80 backdrop-blur-xl backdrop-saturate-150'
            : 'bg-transparent'
        )}
      >
        <a href="#top" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 focus-visible:outline-2 focus-visible:outline-brand">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-tr from-brand to-brand-2 text-white shadow-sm">
            <BrandMark className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
        </a>

        <ul className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {NAV.map((item) => (
            <li key={item.href} className="relative">
              <a
                href={item.href}
                onMouseEnter={() => setHovered(item.href)}
                className="relative block rounded-full px-3.5 py-2 text-sm text-ink-3 transition-colors hover:text-ink"
              >
                {hovered === item.href && (
                  <motion.span
                    layoutId="nav-hover"
                    className="absolute inset-0 rounded-full bg-ink/[0.05]"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <a href={LINKS.signIn} className="px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink">
            Sign in
          </a>
          <ButtonLink href={LINKS.getStarted} arrow>
            Get started
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-2 ring-1 ring-line-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-6xl border-t border-line/80 bg-paper/95 px-5 pb-6 pt-2 backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-line/70 py-3.5 text-[15px] text-ink-2"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <ButtonLink href={LINKS.signIn} variant="secondary">
                Sign in
              </ButtonLink>
              <ButtonLink href={LINKS.getStarted}>Get started</ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
