import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export { cn };

export const Container: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>{children}</div>
);

export const Eyebrow: React.FC<{ children: React.ReactNode; tone?: 'light' | 'dark' }> = ({ children, tone = 'light' }) => (
  <p
    className={cn(
      'inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em]',
      tone === 'light' ? 'text-brand' : 'text-sky-300'
    )}
  >
    <span className={cn('h-px w-5', tone === 'light' ? 'bg-brand/50' : 'bg-sky-300/50')} />
    {children}
  </p>
);

/** Section intro: eyebrow, display headline, supporting paragraph. */
export const SectionHeading: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
}> = ({ eyebrow, title, lede, align = 'center', tone = 'light' }) => (
  <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
    <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
    <h2
      className={cn(
        'mt-4 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[2.75rem]',
        tone === 'light' ? 'text-ink' : 'text-white'
      )}
    >
      {title}
    </h2>
    {lede && (
      <p className={cn('mt-5 text-pretty text-[17px] leading-relaxed', tone === 'light' ? 'text-ink-3' : 'text-slate-400')}>
        {lede}
      </p>
    )}
  </div>
);

/** Serif italic accent used for one or two words inside a headline. */
export const Accent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <em className="font-serif text-[1.08em] font-normal italic tracking-[-0.01em]">{children}</em>
);

type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'ghost-dark';

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(11_18_32/0.2)] hover:bg-ink/90',
  secondary: 'bg-surface text-ink ring-1 ring-line-2 shadow-card hover:ring-ink-4',
  inverse: 'bg-white text-ink hover:bg-white/90',
  'ghost-dark': 'text-white ring-1 ring-white/15 hover:bg-white/5',
};

export const ButtonLink: React.FC<{
  href: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ href, variant = 'primary', size = 'md', arrow, className, children }) => (
  <a
    href={href}
    className={cn(
      'group inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-200',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      size === 'md' ? 'h-9 px-4 text-sm' : 'h-12 px-6 text-[15px]',
      buttonStyles[variant],
      className
    )}
  >
    {children}
    {arrow && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />}
  </a>
);
