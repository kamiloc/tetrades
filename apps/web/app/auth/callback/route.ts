import { NextResponse, type NextRequest } from 'next/server';

import { getAppOrigin } from '../../../lib/app-origin';
import { chooseLanding } from '../../../lib/auth-flow';
import { safeNext } from '../../../lib/safe-next';
import { createServerSupabase } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

// Magic Link landing (design D1): exchange the PKCE code for a session, then
// redirect on the configured origin through safeNext only.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const appOrigin = getAppOrigin();
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNext(request.nextUrl.searchParams.get('next'), appOrigin);

  if (code !== null && code !== '') {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session !== null) {
      const target = await chooseLanding(next, data.session.access_token, appOrigin);
      return NextResponse.redirect(new URL(target, appOrigin));
    }
  }

  const login = new URL('/login', appOrigin);
  login.searchParams.set('error', 'link');
  if (next !== null) login.searchParams.set('next', next);
  return NextResponse.redirect(login);
}
