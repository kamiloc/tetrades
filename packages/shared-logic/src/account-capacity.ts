// One capacity per account (ADR-017). Copy shared by the API (athlete.bootstrap
// rejects trainer and admin accounts) and the mobile onboarding screen.

/** athlete.bootstrap FORBIDDEN message for an account that has trainer rows. */
export const TRAINER_ACCOUNT_ONBOARDING_MESSAGE =
  'This is a trainer account. Use the web portal to work with your club.';

/** athlete.bootstrap FORBIDDEN message for any other non-athlete account. */
export const NON_ATHLETE_ACCOUNT_ONBOARDING_MESSAGE =
  'This account cannot have an athlete profile.';
