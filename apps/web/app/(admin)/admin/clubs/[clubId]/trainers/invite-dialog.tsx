'use client';

import { getApiErrorCode } from '@packages/api-client';
import { inviteTrainerInput } from '@packages/validators';
import { useState } from 'react';

import { Button } from '../../../../../../components/button';
import { Dialog } from '../../../../../../components/dialog';
import { describedBy, Field, TextInput } from '../../../../../../components/field';
import { InlineAlert } from '../../../../../../components/inline-alert';
import { InviteInstructions } from '../../../../../../components/invite-instructions';
import { useWebLocalization } from '../../../../../../lib/i18n';
import { useInviteTrainerMutation } from '../../../../../../lib/portal-mutations';
import type { MessageKey } from '../../../../../../lib/translations';

const ERRORS: Partial<Record<string, MessageKey>> = {
  CONFLICT: 'admin.invite.conflict',
  BAD_REQUEST: 'admin.invite.deactivated',
};

export function InviteDialog({
  open,
  onClose,
  clubId,
  clubName,
  appOrigin,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  appOrigin: string;
}) {
  const { t } = useWebLocalization();
  const invite = useInviteTrainerMutation();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [sent, setSent] = useState<{ email: string; expiresAt: Date } | null>(null);

  const close = () => {
    if (invite.isPending) return;
    setEmail('');
    setFieldError(undefined);
    setFailure(undefined);
    setSent(null);
    onClose();
  };

  const submit = async () => {
    setFailure(undefined);
    const parsed = inviteTrainerInput.safeParse({ clubId, email });
    if (!parsed.success) {
      setFieldError(t('common.invalidEmail'));
      return;
    }
    setFieldError(undefined);
    try {
      const result = await invite.mutateAsync(parsed.data);
      setSent({ email: parsed.data.email, expiresAt: result.expiresAt });
    } catch (error) {
      const code = getApiErrorCode(error);
      setFailure(t((code !== null ? ERRORS[code] : undefined) ?? 'admin.invite.failed'));
    }
  };

  if (sent !== null) {
    return (
      <Dialog
        open={open}
        onClose={close}
        title={t('admin.invite.sentTitle')}
        footer={
          <Button variant="primary" onClick={close}>
            {t('common.done')}
          </Button>
        }
      >
        <InviteInstructions email={sent.email} expiresAt={sent.expiresAt} appOrigin={appOrigin} />
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('admin.invite.title')}
      description={t('admin.invite.description', { club: clubName })}
      footer={
        <>
          <Button onClick={close} disabled={invite.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="invite-trainer-form"
            disabled={invite.isPending}
          >
            {invite.isPending ? t('admin.invite.inviting') : t('admin.invite.submit')}
          </Button>
        </>
      }
    >
      <form
        id="invite-trainer-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field
          id="invite-email"
          label={t('common.email')}
          hint={t('admin.invite.emailHint')}
          error={fieldError}
        >
          <TextInput
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={invite.isPending}
            invalid={fieldError !== undefined}
            aria-describedby={describedBy('invite-email', true, fieldError)}
            autoComplete="off"
          />
        </Field>
      </form>
      {failure ? <InlineAlert tone="error">{failure}</InlineAlert> : null}
    </Dialog>
  );
}
