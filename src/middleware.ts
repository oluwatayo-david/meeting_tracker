import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDeactivated } from '@/lib/authz';

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed: without auth configured, protected pages are not served.
  // (API routes enforce their own session checks and will return 401.)
  if (!supabaseUrl || !supabaseKey) {
    if (isAuthPage || isApiRoute || isPublicAsset) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
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

  // Deactivated accounts: a ban stops new sign-ins, this stops live sessions.
  if (user && isDeactivated(user.banned_until)) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Your account has been deactivated' }, { status: 403 });
    }
    if (!isAuthPage && !isPublicAsset) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '?error=deactivated';
      return NextResponse.redirect(url);
    }
    user = null; // let them reach the login page
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

  // Provisioned / invited users must replace their temporary password first.
  // app_metadata can only be changed server-side, so this can't be skipped.
  const mustChangePassword = Boolean(user?.app_metadata?.must_change_password);
  const isChangePasswordPage = pathname.startsWith('/change-password');
  if (user && !isApiRoute && !isPublicAsset) {
    if (mustChangePassword && !isChangePasswordPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/change-password';
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (!mustChangePassword && isChangePasswordPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

