/**
 * url.ts
 * -------------------------------------------------------------
 * Dynamic URL resolver for development, staging, and production.
 * Ensures all email invitations, callbacks, and redirect URLs
 * pick up the deployed URL automatically without hardcoded values.
 *
 * Resolution priority (highest → lowest):
 *  1. NEXT_PUBLIC_APP_URL  (explicit env var — most reliable)
 *  2. window.location.origin (client-side in browser)
 *  3. x-forwarded-host / host headers (server-side API routes)
 *  4. VERCEL_URL (auto-injected by Vercel platform)
 *  5. http://localhost:3000 (dev fallback)
 */

type HeadersLike = {
  get(name: string): string | null;
};

/**
 * Get the application's base URL dynamically.
 * Works seamlessly in client-side, server-side (Next.js server components / API routes),
 * and deployment platforms like Vercel, Netlify, Render, AWS, or custom domains.
 *
 * @param req Optional NextRequest or standard Request for extracting origin headers in API routes
 */
export function getAppUrl(req?: Request | { headers?: HeadersLike }): string {
  // 1. Explicit env var — the most authoritative source.
  //    Set NEXT_PUBLIC_APP_URL in your .env.local / deployment env vars.
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  // 2. If running in browser (client-side), use the active window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 3. If Request object is provided on the server, extract from request headers
  if (req && 'headers' in req) {
    const headers = req.headers as HeadersLike | undefined;
    if (headers?.get) {
      // x-forwarded-host is set by proxies/load balancers (Vercel, Nginx, Cloudflare)
      const forwardedHost = headers.get('x-forwarded-host');
      const proto = headers.get('x-forwarded-proto') || 'https';
      if (forwardedHost) {
        const scheme =
          forwardedHost.includes('localhost') || forwardedHost.includes('127.0.0.1')
            ? 'http'
            : proto;
        return `${scheme}://${forwardedHost}`;
      }

      // Fall back to plain Host header
      const host = headers.get('host');
      if (host) {
        const scheme =
          host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        return `${scheme}://${host}`;
      }
    }
  }

  // 4. Vercel deployment URL (auto-injected by Vercel build environment)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/\/$/, '')}`;
  }

  // 5. Development fallback
  return 'http://localhost:3000';
}

/**
 * Returns the authentication callback redirect URL.
 * Use this for Supabase inviteUserByEmail, signUp, resend, etc.
 */
export function getAuthCallbackUrl(req?: Request): string {
  return `${getAppUrl(req)}/auth/callback`;
}
