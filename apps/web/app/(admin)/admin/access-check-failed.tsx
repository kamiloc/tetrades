'use client';

import { useRouter } from 'next/navigation';

import { ErrorState } from '../../../components/states';

// The API couldn't be reached to confirm admin access.
export function AccessCheckFailed() {
  const router = useRouter();
  return (
    <main lang="en" className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[440px] rounded-[16px] border border-line bg-paper shadow-sm">
        <ErrorState title="We couldn't check your access" onRetry={() => router.refresh()}>
          The portal can&apos;t reach the server right now. Try again in a moment.
        </ErrorState>
      </div>
    </main>
  );
}
