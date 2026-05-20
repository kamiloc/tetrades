import {
  sendMagicLink,
  type AuthClient,
  type Session,
} from '@packages/auth';

import { authClient } from './auth-client';

type MagicLinkOtpType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'email';

interface SendLoginMagicLinkParams {
  email: string;
  emailRedirectTo: string;
}

export async function sendLoginMagicLink({
  email,
  emailRedirectTo,
}: SendLoginMagicLinkParams): Promise<void> {
  await sendMagicLink(authClient, {
    email,
    emailRedirectTo,
    shouldCreateUser: false,
  });
}

interface VerifyMagicLinkParams {
  tokenHash: string;
  type: string;
}

function isMagicLinkOtpType(type: string): type is MagicLinkOtpType {
  return (
    type === 'signup' ||
    type === 'invite' ||
    type === 'magiclink' ||
    type === 'recovery' ||
    type === 'email_change' ||
    type === 'email'
  );
}

export async function verifyMagicLinkCallback(
  client: AuthClient,
  params: VerifyMagicLinkParams,
): Promise<Session> {
  if (!isMagicLinkOtpType(params.type)) {
    throw new Error('Invalid magic link type');
  }

  const { data, error } = await client.auth.verifyOtp({
    token_hash: params.tokenHash,
    type: params.type,
  });

  if (error) throw error;
  if (!data.session) {
    throw new Error('Magic link verification succeeded but no session was returned');
  }
  return data.session;
}
