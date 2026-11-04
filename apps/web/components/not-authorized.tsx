import Link from 'next/link';

import { signOut } from '../app/auth/actions';

import { ApMark } from './ap-mark';
import { Button, buttonClasses } from './button';

// Shown to a signed-in user who isn't allowed into an area. It renders no
// portal markup and loads no data; the API enforces access on every call.
export function NotAuthorized({ email }: { email: string | null }) {
  return (
    <main lang="en" className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[440px] rounded-[16px] border border-line bg-paper p-6 shadow-sm">
        <ApMark size={32} />
        <h1 className="mt-4 text-[22px] font-bold tracking-[-0.4px]">Not authorized</h1>
        <p className="mt-2 text-[13px] text-muted">
          {email ? (
            <>
              You&apos;re signed in as <strong className="text-text">{email}</strong>, which
              doesn&apos;t have access to this area.
            </>
          ) : (
            <>This account doesn&apos;t have access to this area.</>
          )}{' '}
          If you were invited as a trainer, sign out and sign in with the invited email.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <form action={signOut}>
            <Button type="submit" variant="primary">
              Sign out
            </Button>
          </form>
          <Link href="/trainer/invitations" className={buttonClasses('secondary')}>
            Trainer invitations
          </Link>
        </div>
      </div>
    </main>
  );
}
