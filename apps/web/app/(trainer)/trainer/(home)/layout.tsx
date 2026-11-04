import type { ReactNode } from 'react';

import { getSessionUser } from '../../../../lib/session';
import { TrainerShell } from '../_components/trainer-shell';

export const dynamic = 'force-dynamic';

// /trainer, the club picker and trainer invitations: the generic trainer nav.
export default async function TrainerHomeLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  return <TrainerShell user={user}>{children}</TrainerShell>;
}
