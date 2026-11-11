import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSessionUser } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// Session check only (design D1). The (home) group and the club pages each
// render their own shell. Signed out: middleware already redirected with the
// exact `next`; this is a fallback for a session that ended meanwhile.
export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user === null) redirect('/login');
  return <>{children}</>;
}
