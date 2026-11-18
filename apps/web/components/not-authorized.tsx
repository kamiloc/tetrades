'use client';

import Link from 'next/link';

import { signOut } from '../app/auth/actions';
import { useWebLocalization } from '../lib/i18n';

import { ApMark } from './ap-mark';
import { Button, buttonClasses } from './button';

// Shown to a signed-in user who isn't allowed into an area. It renders no
// portal markup and loads no data; the API enforces access on every call.
export function NotAuthorized({ email }: { email: string | null }) {
  const { t, rich } = useWebLocalization();
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[440px] rounded-[16px] border border-line bg-paper p-6 shadow-sm">
        <ApMark size={32} />
        <h1 className="mt-4 text-[22px] font-bold tracking-[-0.4px]">{t('access.notAuthorized')}</h1>
        <p className="mt-2 text-[13px] text-muted">
          {email
            ? rich('access.signedInAs', { email: <strong className="text-text">{email}</strong> })
            : t('access.noAccess')}{' '}
          {t('access.invitedHint')}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <form action={signOut}>
            <Button type="submit" variant="primary">
              {t('common.signOut')}
            </Button>
          </form>
          <Link href="/trainer/invitations" className={buttonClasses('secondary')}>
            {t('access.trainerInvitations')}
          </Link>
        </div>
      </div>
    </main>
  );
}
