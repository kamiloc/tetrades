import Link from 'next/link';

import { buttonClasses } from '../../../../components/button';
import { EmptyState } from '../../../../components/states';

// A signed-in user who trains no active club (spec: "No club").
export function NoClub() {
  return (
    <EmptyState
      icon="flag"
      title="You're not a trainer of any club yet"
      action={
        <Link href="/trainer/invitations" className={buttonClasses('primary')}>
          See trainer invitations
        </Link>
      }
    >
      When a club&apos;s admin invites you, accept the invitation to start working with its
      athletes.
    </EmptyState>
  );
}
