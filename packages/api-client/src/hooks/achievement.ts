import type {
  ListAchievementsInput,
  ListMyCertificationRequestsInput,
  ListPendingCertificationsInput,
} from '@packages/validators';

import { trpc } from '../client.js';

export const useAddAchievement = () => trpc.achievement.addAchievement.useMutation();

// One cursor page of the achievements the caller may see (take ≤ 50).
export const useListAchievements = (
  input: Pick<ListAchievementsInput, 'athleteId'> & Partial<ListAchievementsInput>,
) => trpc.achievement.listAchievements.useQuery(input);

// ── Certification by club trainers ─────────────────────────────────────────
// Athlete: ask a club where they are ACTIVE to certify one of their achievements.
export const useRequestCertification = () => trpc.achievement.requestCertification.useMutation();

export const useWithdrawCertification = () => trpc.achievement.withdrawCertification.useMutation();

// The athlete's own requests in every status, with rejection reasons (take ≤ 50).
export const useMyCertificationRequests = (input: Partial<ListMyCertificationRequestsInput> = {}) =>
  trpc.achievement.listMyCertificationRequests.useQuery(input);

// Trainer: the club's PENDING queue.
export const usePendingCertifications = (
  input: Pick<ListPendingCertificationsInput, 'clubId'> & Partial<ListPendingCertificationsInput>,
) => trpc.achievement.listPendingCertifications.useQuery(input);

export const useDecideCertification = () => trpc.achievement.decideCertification.useMutation();
