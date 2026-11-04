'use client';

import { getApiErrorCode } from '@packages/api-client';
import { inviteTrainerInput } from '@packages/validators';
import { useState } from 'react';

import { Button } from '../../../../../../components/button';
import { Dialog } from '../../../../../../components/dialog';
import { describedBy, Field, TextInput } from '../../../../../../components/field';
import { InlineAlert } from '../../../../../../components/inline-alert';
import { InviteInstructions } from '../../../../../../components/invite-instructions';
import { useInviteTrainerMutation } from '../../../../../../lib/portal-mutations';

const ERRORS: Record<string, string> = {
  CONFLICT:
    'This email already has a pending invitation to this club, or already belongs to one of its trainers.',
  BAD_REQUEST: 'This club is deactivated. Reactivate it before inviting trainers.',
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
      setFieldError('Enter a valid email address.');
      return;
    }
    setFieldError(undefined);
    try {
      const result = await invite.mutateAsync(parsed.data);
      setSent({ email: parsed.data.email, expiresAt: result.expiresAt });
    } catch (error) {
      const code = getApiErrorCode(error);
      setFailure(
        (code !== null ? ERRORS[code] : undefined) ??
          "We couldn't create the invitation. Try again.",
      );
    }
  };

  if (sent !== null) {
    return (
      <Dialog
        open={open}
        onClose={close}
        title="Trainer invited"
        footer={
          <Button variant="primary" onClick={close}>
            Done
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
      title="Invite a trainer"
      description={`They become a trainer of ${clubName} when they accept, signed in with this email.`}
      footer={
        <>
          <Button onClick={close} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="invite-trainer-form"
            disabled={invite.isPending}
          >
            {invite.isPending ? 'Inviting…' : 'Invite'}
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
          label="Email"
          hint="Use the address they'll sign in with. A trainer needs an account separate from any athlete account."
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
