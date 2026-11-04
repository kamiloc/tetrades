import { NextResponse, type NextRequest } from 'next/server';

import { getAppOrigin } from './lib/app-origin';
import { createSupabaseWithCookies } from './lib/supabase-server';

// Session refresh and route protection (design D2), following the Supabase
// Next.js SSR pattern. Cookies refreshed here reach the page or proxy through
// the request, and the browser through whichever response is returned,
// redirects included.

const PROTECTED_PREFIXES = ['/admin', '/trainer'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createSupabaseWithCookies({
    getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (toSet) => {
      for (const { name, value } of toSet) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
    },
  });

  // getUser() validates the session with Supabase and refreshes it if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (user === null && isProtected(pathname)) {
    // Built from the configured origin, never from Host / X-Forwarded-Host.
    const login = new URL('/login', getAppOrigin());
    login.searchParams.set('next', `${pathname}${search}`);
    const redirect = NextResponse.redirect(login);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
