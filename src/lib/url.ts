/**
 * url.ts
 * -------------------------------------------------------------
 * Dynamic URL resolver for development, staging, and production.
 * Ensures all email invitations, callbacks, and redirect URLs
 * pick up the deployed URL automatically without hardcoded values.
 */

/**
 * Get the application's base URL dynamically.
 * Works seamlessly in client-side, server-side (Next.js server components / API routes),
 * and deployment platforms like Vercel, Netlify, Render, AWS, or custom domains.
 *
 * @param req Optional NextRequest or standard Request for extracting origin headers in API routes
 */
export function getAppUrl(req?: Request | { headers?: Headers | { get: (name: string) => string | null } }): string {
  // 1. If running in browser (client-side), always use the active window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 2. If Request object is provided on the server, extract from request headers
  if (req && 'headers' in req) {
    const headers = req.headers instanceof Headers ? req.headers : req.headers;
    const host = headers?.get?.('x-forwarded-host') || headers?.get?.('host');
    const proto = headers?.get?.('x-forwarded-proto') || 'https';
    if (host) {
      // In local dev, localhost might not have TLS
      const scheme = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : proto;
      return `${scheme}://${host}`;
    }
  }

  // 3. Check explicit environment variables
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }

  // 4. Vercel deployment URL (auto-injected by Vercel environment)
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
 * Returns the authentication callback redirect URL
 */
export function getAuthCallbackUrl(req?: Request): string {
  return `${getAppUrl(req)}/auth/callback`;
}
