import type { ListAchievementsInput } from '@packages/validators';

import { trpc } from '../client.js';

export const useAddAchievement = () => trpc.achievement.addAchievement.useMutation();

// One cursor page of the achievements the caller may see (take ≤ 50).
export const useListAchievements = (
  input: Pick<ListAchievementsInput, 'athleteId'> & Partial<ListAchievementsInput>,
) => trpc.achievement.listAchievements.useQuery(input);

export const useVerifyAchievement = () => trpc.achievement.verifyAchievement.useMutation();
