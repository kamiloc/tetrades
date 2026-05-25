import { trpc } from '../client.js';

export const useAthleteProfile = (athleteId: string) =>
  trpc.athlete.getProfile.useQuery({ athleteId });

export const useUpdateProfile = () => trpc.athlete.updateProfile.useMutation();

export const usePublicProfile = (slug: string) =>
  trpc.athlete.getPublicProfile.useQuery({ slug });

export const useSearchAthletes = (query: string, sportId?: string, cursor?: string) =>
  trpc.athlete.searchAthletes.useQuery({ query, sportId, cursor });

// Query: resolve the current session user's athlete identity
export const useMyAthlete = () =>
  trpc.athlete.getMyAthlete.useQuery();

// Query: lightweight onboarding-state probe used by the routing layer.
// Returns booleans (never throws on missing rows), so it's safe to call
// before either UserAccount or Athlete exists.
export const useOnboardingState = () =>
  trpc.athlete.getOnboardingState.useQuery();

// Mutation: create the Athlete row from the onboarding form.
export const useBootstrapAthlete = () =>
  trpc.athlete.bootstrap.useMutation();

export const useMyPublicProfile = () =>
  trpc.athlete.getMyPublicProfile.useQuery();

export const useUpdatePublicProfile = () =>
  trpc.athlete.updatePublicProfile.useMutation();
