import { trpc } from '../client.js';

// Owner-only: the caller's own visibility settings. When unset, each category
// uses its default: PRIVATE for club memberships and metrics, PUBLIC for achievements.
export const useMyVisibilitySettings = () => trpc.visibility.get.useQuery();

export const useUpdateVisibilitySettings = () => trpc.visibility.update.useMutation();
