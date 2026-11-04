import { createServerSupabase } from './supabase-server';

// The signed-in user as the server session knows it, for display only.
// Authorization is always decided by the API.
export interface SessionUser {
  email: string | null;
  emailConfirmed: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return null;
  return {
    email: user.email ?? null,
    emailConfirmed: typeof user.email_confirmed_at === 'string' && user.email_confirmed_at !== '',
  };
}
