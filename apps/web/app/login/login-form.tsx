'use client';

import { useActionState } from 'react';

import { Button } from '../../components/button';
import { describedBy, Field, TextInput } from '../../components/field';
import { focusRing } from '../../components/focus';
import { InlineAlert } from '../../components/inline-alert';
import { requestSignIn, verifyCode, type LoginState } from '../auth/actions';

const EMAIL_ERRORS = {
  'invalid-email': 'Enter a valid email address.',
  unavailable: "We couldn't send the email right now. Wait a minute and try again.",
} as const;

async function loginAction(previous: LoginState, formData: FormData): Promise<LoginState> {
  return formData.get('intent') === 'verify'
    ? verifyCode(previous, formData)
    : requestSignIn(previous, formData);
}

export function LoginForm({ next, linkFailed }: { next: string; linkFailed: boolean }) {
  const [state, action, pending] = useActionState(loginAction, { step: 'email', email: '', next });

  if (state.step === 'email') {
    const error = state.error ? EMAIL_ERRORS[state.error] : undefined;
    return (
      <form action={action} className="flex flex-col gap-4" noValidate>
        {linkFailed && !state.error ? (
          <InlineAlert tone="warning" title="That sign-in link didn't work">
            It may have expired or been opened in a different browser. Request a new email, or use
            the code it contains.
          </InlineAlert>
        ) : null}
        <input type="hidden" name="intent" value="request" />
        <input type="hidden" name="next" value={state.next} />
        <Field id="email" label="Email" error={error}>
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
          {pending ? 'Sending…' : 'Email me a sign-in link'}
        </Button>
      </form>
    );
  }

  const codeError =
    state.error === 'invalid-code'
      ? 'That code is wrong or has expired. Request a new code and try again.'
      : state.error === 'unavailable'
        ? EMAIL_ERRORS.unavailable
        : undefined;

  return (
    <div className="flex flex-col gap-4">
      <InlineAlert tone="info" title={state.resent ? 'We sent a new email' : 'Check your inbox'}>
        We sent a sign-in link and a code to <strong>{state.email}</strong>. Open the link in this
        browser, or enter the code below.
      </InlineAlert>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={state.next} />
        <Field id="code" label="One-time code" error={codeError}>
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
          {pending ? 'Checking…' : 'Sign in'}
        </Button>
      </form>
      <form action={action} className="flex items-center justify-between">
        <input type="hidden" name="intent" value="request" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={state.next} />
        <Button type="submit" variant="link" size="sm" disabled={pending} className="px-0">
          Send a new code
        </Button>
        <a
          href={state.next ? `/login?next=${encodeURIComponent(state.next)}` : '/login'}
          className={`rounded-sm text-[11.5px] font-semibold text-muted hover:text-text ${focusRing}`}
        >
          Use a different email
        </a>
      </form>
    </div>
  );
}
