/** Where the product app is deployed. Every sign-in / sign-up link points here. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Public URL of this marketing site — used for canonical + Open Graph URLs. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export const LINKS = {
  signIn: `${APP_URL}/login`,
  getStarted: `${APP_URL}/register`,
} as const;

export const NAV = [
  { label: 'Product', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Teams', href: '#teams' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
] as const;
