// Where the web server reaches the API (design D3). Reuses the existing
// NEXT_PUBLIC_API_URL, which points at the tRPC endpoint (`…/trpc`); the
// suffix is accepted with or without it and handled only here.

/** Base URL of the API's tRPC endpoint, without a trailing slash, e.g. `http://localhost:4000/trpc`. */
export function parseApiTrpcUrl(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    throw new Error('NEXT_PUBLIC_API_URL is not set.');
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_API_URL must use http or https.');
  }
  const base = url.pathname.replace(/\/+$/, '').replace(/\/trpc$/, '');
  return `${url.origin}${base}/trpc`;
}

export function getApiTrpcUrl(): string {
  return parseApiTrpcUrl(process.env['NEXT_PUBLIC_API_URL']);
}
