import { randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { getApiTrpcUrl } from '../../../../lib/api-origin';
import { getAppOrigin } from '../../../../lib/app-origin';
import { logError, logInfo } from '../../../../lib/log';
import { createSupabaseWithCookies, type CookieToSet } from '../../../../lib/supabase-server';

// Same-origin tRPC proxy for browser calls (design D3). It adds the server
// session's access token and forwards method, path, query and body
// unchanged. The browser never sees a token, and browser cookies never reach
// the API.

export const dynamic = 'force-dynamic';

// Request headers forwarded upstream; everything else (cookie, host, the
// client's authorization, x-forwarded-*) is dropped.
const FORWARDED_HEADERS = ['content-type', 'accept', 'trpc-accept'];

// Procedure paths, alone or comma-separated in a batch. Anything else (an
// encoded slash, dots that walk out of /trpc) never reaches the API.
const PROCEDURE_PATH = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*(?:,[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)*$/;

type RouteContext = { params: Promise<{ trpc: string }> };

function finish(response: NextResponse, cookies: CookieToSet[], requestId: string): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  response.headers.set('x-request-id', requestId);
  for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
  return response;
}

async function proxy(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = randomUUID();
  const { trpc: procedure } = await context.params;
  const method = request.method;

  if (!PROCEDURE_PATH.test(procedure)) {
    return finish(NextResponse.json({ error: 'Not found' }, { status: 404 }), [], requestId);
  }

  // CSRF: a mutation must come from our own configured origin. Host and
  // X-Forwarded-* are never consulted. Browsers send Origin on POST fetches.
  if (method === 'POST' && request.headers.get('origin') !== getAppOrigin()) {
    logInfo('trpc proxy rejected cross-origin request', {
      requestId,
      method,
      procedure,
      status: 403,
    });
    return finish(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), [], requestId);
  }

  // Middleware has already refreshed the session; a refresh here (a race)
  // is still written back on this response.
  const refreshed: CookieToSet[] = [];
  const supabase = createSupabaseWithCookies({
    getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (cookies) => refreshed.push(...cookies),
  });
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? null;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  if (accessToken !== null) headers.set('authorization', `Bearer ${accessToken}`);
  headers.set('x-request-id', requestId);

  const upstreamUrl = `${getApiTrpcUrl()}/${procedure}${request.nextUrl.search}`;
  // `duplex` is required by Node's fetch to stream a request body.
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
    ...(method === 'POST' ? { body: request.body, duplex: 'half' } : {}),
  };
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch {
    logError('trpc proxy upstream unreachable', { requestId, method, procedure, status: 502 });
    return finish(
      NextResponse.json({ error: 'Bad gateway' }, { status: 502 }),
      refreshed,
      requestId,
    );
  }

  const response = new NextResponse(upstream.body, { status: upstream.status });
  const contentType = upstream.headers.get('content-type');
  if (contentType !== null) response.headers.set('content-type', contentType);
  logInfo('trpc proxy', { requestId, method, procedure, status: upstream.status });
  return finish(response, refreshed, requestId);
}

export const GET = proxy;
export const POST = proxy;
