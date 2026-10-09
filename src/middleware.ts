import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static files, auth pages, and API routes through
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/auth');
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicAsset = pathname.includes('.');

  // If no Supabase env vars, just let everything through (dev fallback)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  // Validate the key looks like a JWT (starts with eyJ) before using it
  // Some key formats like sb_publishable_ are not valid for SSR auth
  const keyIsJwt = supabaseKey.startsWith('eyJ');

  if (!keyIsJwt) {
    // Key format not supported for SSR — skip auth check, allow all through
    // Auth will be handled client-side via AuthProvider
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  let user = null;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // Supabase unavailable — don't block auth pages, fail open for API routes
    console.warn('[Middleware] Supabase auth check failed:', err);
    if (isAuthPage || isApiRoute || isPublicAsset) {
      return NextResponse.next({ request });
    }
    // For protected pages, redirect to login on auth failure
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Logged-in users redirected away from auth pages
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Unauthenticated users on protected pages → login
  if (!isAuthPage && !isApiRoute && !isPublicAsset && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

