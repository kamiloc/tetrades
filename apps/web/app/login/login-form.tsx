'use client';

import { useActionState } from 'react';

import { Button } from '../../components/button';
import { describedBy, Field, TextInput } from '../../components/field';
import { focusRing } from '../../components/focus';
import { InlineAlert } from '../../components/inline-alert';
import { useWebLocalization } from '../../lib/i18n';
import type { MessageKey } from '../../lib/translations';
import { requestSignIn, verifyCode, type LoginState } from '../auth/actions';

const EMAIL_ERRORS = {
  'invalid-email': 'login.invalidEmail',
  unavailable: 'login.unavailable',
} as const satisfies Record<string, MessageKey>;

async function loginAction(previous: LoginState, formData: FormData): Promise<LoginState> {
  return formData.get('intent') === 'verify'
    ? verifyCode(previous, formData)
    : requestSignIn(previous, formData);
}

export function LoginForm({ next, linkFailed }: { next: string; linkFailed: boolean }) {
  const { t, rich } = useWebLocalization();
  const [state, action, pending] = useActionState(loginAction, { step: 'email', email: '', next });

  if (state.step === 'email') {
    const error = state.error ? t(EMAIL_ERRORS[state.error]) : undefined;
    return (
      <form action={action} className="flex flex-col gap-4" noValidate>
        {linkFailed && !state.error ? (
          <InlineAlert tone="warning" title={t('login.linkFailedTitle')}>
            {t('login.linkFailedBody')}
          </InlineAlert>
        ) : null}
        <input type="hidden" name="intent" value="request" />
        <input type="hidden" name="next" value={state.next} />
        <Field id="email" label={t('login.email')} error={error}>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={state.email}
            invalid={error !== undefined}
            aria-describedby={describedBy('email', undefined, error)}
            autoFocus
          />
        </Field>
        <Button type="submit" variant="primary" disabled={pending} className="w-full py-[9px]">
          {pending ? t('login.sending') : t('login.emailLink')}
        </Button>
      </form>
    );
  }

  const codeError =
    state.error === 'invalid-code'
      ? t('login.invalidCode')
      : state.error === 'unavailable'
        ? t(EMAIL_ERRORS.unavailable)
        : undefined;

  return (
    <div className="flex flex-col gap-4">
      <InlineAlert tone="info" title={state.resent ? t('login.resentTitle') : t('login.checkInbox')}>
        {rich('login.sentTo', { email: <strong>{state.email}</strong> })}
      </InlineAlert>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={state.next} />
        <Field id="code" label={t('login.code')} error={codeError}>
          <TextInput
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            required
            mono
            invalid={codeError !== undefined}
            aria-describedby={describedBy('code', undefined, codeError)}
            autoFocus
          />
        </Field>
        <Button type="submit" variant="primary" disabled={pending} className="w-full py-[9px]">
          {pending ? t('login.checking') : t('login.signIn')}
        </Button>
      </form>
      <form action={action} className="flex items-center justify-between">
        <input type="hidden" name="intent" value="request" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={state.next} />
        <Button type="submit" variant="link" size="sm" disabled={pending} className="px-0">
          {t('login.newCode')}
        </Button>
        <a
          href={state.next ? `/login?next=${encodeURIComponent(state.next)}` : '/login'}
          className={`rounded-sm text-[11.5px] font-semibold text-muted hover:text-text ${focusRing}`}
        >
          {t('login.differentEmail')}
        </a>
      </form>
    </div>
  );
}
