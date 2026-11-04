'use client';

import { getApiErrorCode, trpc, useMyTrainerClubs } from '@packages/api-client';
import type { MetricDefinitionPublicOutput } from '@packages/validators';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { needsTrainerCheck, trainerErrorNotice, type TrainerAction, type TrainerNotice } from './errors';
import { MY_CLUBS_LIMIT } from './my-clubs-limit';

/** The current club as the caller's own trainer clubs list it (cached). */
export function useCurrentClub(clubId: string) {
  const clubs = useMyTrainerClubs({ take: MY_CLUBS_LIMIT });
  const club = clubs.data?.items.find((item) => item.club.id === clubId)?.club;
  return { club, isPending: clubs.isPending };
}

/**
 * Turns a failed call into a notice (design D6). A FORBIDDEN write re-reads
 * the caller's clubs to tell a lost trainer role from a lost membership; a
 * lost role refreshes the page, so the club layout guard takes over.
 */
export function useTrainerErrors(clubId: string) {
  const utils = trpc.useUtils();
  const router = useRouter();
  return useCallback(
    async (error: unknown, action: TrainerAction): Promise<TrainerNotice> => {
      const code = getApiErrorCode(error);
      let stillTrainer: boolean | null = null;
      if (needsTrainerCheck(code, action)) {
        try {
          const page = await utils.club.listMyTrainerClubs.fetch({ take: MY_CLUBS_LIMIT });
          stillTrainer = page.items.some((item) => item.club.id === clubId);
        } catch {
          stillTrainer = null;
        }
      }
      const notice = trainerErrorNotice(code, stillTrainer, action);
      if (notice.kind === 'not-trainer') {
        await utils.club.listMyTrainerClubs.invalidate();
        router.refresh();
      }
      return notice;
    },
    [clubId, router, utils],
  );
}

/** A club-scoped query that fails with FORBIDDEN or NOT_FOUND refreshes into the guard. */
export function useRefreshOnLostAccess(error: unknown, action: TrainerAction = 'load') {
  const router = useRouter();
  const lost =
    error !== null &&
    error !== undefined &&
    trainerErrorNotice(getApiErrorCode(error), null, action).kind === 'not-trainer';
  useEffect(() => {
    if (lost) router.refresh();
  }, [lost, router]);
  return lost;
}

/**
 * Every active metric definition (design D4): a small public catalog, fetched
 * page by page until done, then filtered on the client.
 */
export function useMetricCatalog({ enabled = true }: { enabled?: boolean } = {}) {
  const query = trpc.metric.listDefinitions.useInfiniteQuery(
    { take: 50 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined, enabled },
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const definitions = useMemo<MetricDefinitionPublicOutput[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  return {
    definitions,
    isPending: (enabled && query.isPending) || hasNextPage === true,
    isError: query.isError,
    refetch: query.refetch,
  };
}
