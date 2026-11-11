'use client';

import { useRouter } from 'next/navigation';

import { ErrorState } from '../../../../components/states';

// The API couldn't be reached to list the caller's clubs.
export function LoadFailed() {
  const router = useRouter();
  return (
    <ErrorState title="We couldn't load your clubs" onRetry={() => router.refresh()}>
      The portal can&apos;t reach the server right now. Try again in a moment.
    </ErrorState>
  );
}
