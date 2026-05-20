import { getCurrentSession } from '@packages/auth';

import { authClient } from './auth-client';

export async function getToken(): Promise<string | null> {
  const session = await getCurrentSession(authClient);
  return session?.access_token ?? null;
}
