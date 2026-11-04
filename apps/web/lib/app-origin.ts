// The one trusted origin of the web app (design D10). Sign-in redirects,
// middleware redirects, return paths, the proxy's CSRF check and invitation
// links all use it. It is never derived from Host, X-Forwarded-Host or
// request.url, so spoofed headers can't redirect users or pass the CSRF check.

/** Parse a configured origin. Throws on a missing value, a non-http(s) scheme, or a path. */
export function parseAppOrigin(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(
      'WEB_URL is not set. Set it to the web app origin, e.g. http://localhost:3000.',
    );
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('WEB_URL is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('WEB_URL must use http or https.');
  }
  if (
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== '' ||
    url.username ||
    url.password
  ) {
    throw new Error('WEB_URL must be an origin only, with no path, query or credentials.');
  }
  return url.origin;
}

/** The configured origin, read from WEB_URL at first use (server only). */
export function getAppOrigin(): string {
  return parseAppOrigin(process.env['WEB_URL']);
}
