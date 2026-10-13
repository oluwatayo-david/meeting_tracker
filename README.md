# SyncLog — from meeting to done

Turborepo monorepo (npm workspaces).

```
apps/
  web/       The SyncLog product — Next.js 15, Supabase, Gemini   → http://localhost:3000
  landing/   Marketing site — Next.js 15, Tailwind 4, static       → http://localhost:3001
packages/
  brand/              Shared product name, tagline, description and <BrandMark /> logo
  typescript-config/  Shared tsconfig base
```

## Getting started

```bash
npm install
npm run dev            # both apps
npm run dev:web        # product only
npm run dev:landing    # landing page only
```

Other tasks (run across every workspace, cached by Turbo):

```bash
npm run build
npm run lint
npm run typecheck
```

## Environment

- `apps/web/.env` — Supabase, Gemini and SMTP settings. See `apps/web/.env.example`.
- `apps/landing/.env` — `NEXT_PUBLIC_APP_URL` (where Sign in / Get started point) and
  `NEXT_PUBLIC_SITE_URL` (canonical URL). See `apps/landing/.env.example`.

## Database

Supabase SQL lives in `apps/web/supabase/` and is run manually in the Supabase SQL editor, in order:

1. `supabase-rls-setup.sql`
2. `supabase-security-fixes.sql`
3. `supabase-hardening.sql`
4. `supabase-user-integrity.sql`

## Branding

Change the product name or tagline once in `packages/brand/src/index.ts` — both apps and all emails pick it up.

## Deploying

Deploy each app as its own project (e.g. on Vercel, set the root directory to `apps/web` or `apps/landing`).
A common setup is the landing page on the root domain and the product on `app.` — set the landing
site's `NEXT_PUBLIC_APP_URL` to the product URL.
