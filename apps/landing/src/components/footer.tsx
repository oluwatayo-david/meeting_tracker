import React from 'react';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@synclog/brand';
import { BrandMark } from '@synclog/brand/mark';
import { LINKS, NAV } from '@/lib/site';
import { Container } from './ui';

export const Footer: React.FC = () => (
  <footer className="border-t border-line bg-surface">
    <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <a href="#top" className="inline-flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-tr from-brand to-brand-2 text-white">
            <BrandMark className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
        </a>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-3">{APP_DESCRIPTION}</p>
      </div>

      <nav aria-label="Product">
        <p className="text-[13px] font-semibold">Product</p>
        <ul className="mt-4 space-y-3">
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="text-sm text-ink-3 transition-colors hover:text-ink">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Account">
        <p className="text-[13px] font-semibold">Account</p>
        <ul className="mt-4 space-y-3">
          <li>
            <a href={LINKS.signIn} className="text-sm text-ink-3 transition-colors hover:text-ink">
              Sign in
            </a>
          </li>
          <li>
            <a href={LINKS.getStarted} className="text-sm text-ink-3 transition-colors hover:text-ink">
              Create an account
            </a>
          </li>
        </ul>
      </nav>
    </Container>

    <Container className="flex flex-col gap-2 border-t border-line py-6 text-[13px] text-ink-4 sm:flex-row sm:items-center sm:justify-between">
      <p>
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </p>
      <p>{APP_TAGLINE}.</p>
    </Container>
  </footer>
);
