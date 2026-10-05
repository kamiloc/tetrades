import { trpc } from '../client.js';

// Owner-only: the caller's own visibility settings (PRIVATE defaults when unset).
export const useMyVisibilitySettings = () => trpc.visibility.get.useQuery();

export const useUpdateVisibilitySettings = () => trpc.visibility.update.useMutation();
