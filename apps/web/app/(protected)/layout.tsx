'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { getToken } from '../../lib/get-token';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    void getToken().then((token) => {
      if (token === null) {
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    });
  }, [router]);

  if (isChecking) {
    return <div>Loading…</div>;
  }

  return <>{children}</>;
}
