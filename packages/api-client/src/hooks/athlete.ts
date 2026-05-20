import { trpc } from '../client.js';

export const useAthleteProfile = (athleteId: string) =>
  trpc.athlete.getProfile.useQuery({ athleteId });

export const useUpdateProfile = () => trpc.athlete.updateProfile.useMutation();

export const usePublicProfile = (slug: string) =>
  trpc.athlete.getPublicProfile.useQuery({ slug });

export const useSearchAthletes = (query: string, sportId?: string, cursor?: string) =>
  trpc.athlete.searchAthletes.useQuery({ query, sportId, cursor });
