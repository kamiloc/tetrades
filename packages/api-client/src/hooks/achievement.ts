import { trpc } from '../client.js';

export const useAddAchievement = () => trpc.achievement.addAchievement.useMutation();

export const useListAchievements = (athleteId: string) =>
  trpc.achievement.listAchievements.useQuery({ athleteId });

export const useVerifyAchievement = () => trpc.achievement.verifyAchievement.useMutation();
