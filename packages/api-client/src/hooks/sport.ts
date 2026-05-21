import { trpc } from '../client.js';

// Public list of active sports, used by the onboarding sport dropdown.
export const useSports = () => trpc.sport.list.useQuery();
