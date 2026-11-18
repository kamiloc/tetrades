'use client';

import { useState } from 'react';

import { formatDateTime } from '../lib/format';
import { useWebLocalization } from '../lib/i18n';

import { Button } from './button';
import { TextInput } from './field';
import { InlineAlert } from './inline-alert';

// What the admin passes on after inviting a trainer: no email is sent. The
// origin comes from the server as a prop, so the bundle never reads WEB_URL.
export function InviteInstructions({
  email,
  expiresAt,
  appOrigin,
}: {
  email: string;
  expiresAt: Date;
  appOrigin: string;
}) {
  const { locale, t, rich } = useWebLocalization();
  const link = `${appOrigin}/trainer/invitations`;
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <InlineAlert tone="info" title={t('invite.createdTitle')}>
      <p>
        {rich('invite.instructions', {
          email: <strong>{email}</strong>,
          link: <strong>{link}</strong>,
          expires: <strong>{formatDateTime(locale, expiresAt)}</strong>,
        })}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <TextInput
          aria-label={t('invite.linkLabel')}
          value={link}
          readOnly
          mono
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button icon="copy" onClick={() => void copyLink()}>
          {copy === 'copied' ? t('invite.copied') : t('invite.copyLink')}
        </Button>
      </div>
      <p aria-live="polite" className="mt-1 text-[11.5px]">
        {copy === 'failed' ? t('invite.copyBlocked') : ''}
      </p>
    </InlineAlert>
  );
}
