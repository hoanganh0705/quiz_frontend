/**
 * `useMyTournamentHistory` — cursor-paginated tournament history for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B4.
 *
 * Wraps `listMyTournamentHistory` from `users.profile.service.ts` in `useCursorPaginated`.
 *
 * ## Fetcher adapter
 *
 * The fetcher reads `cursor`, calls the service, and:
 *   1. Unwraps the wire envelope `{ data, meta }` to `CursorPage<TournamentHistoryItem>`.
 *   2. Synthesises `id` from `tournamentId` so `appendUniqueById` deduplication works.
 *
 * ## SWR key
 *
 * The key is `['users', 'me', 'tournament-history']`. Changing the key resets pagination.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { listMyTournamentHistory } from "@/features/users/services/users.profile.service";
import { myTournamentHistoryKey } from "@/features/users/types/tournament.types";
import type { MyTournamentHistoryItemDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentHistoryParams {
  limit?: number;
}

/** Wire envelope returned by `listMyTournamentHistory` (post-unwrap). */
type ListMyTournamentHistoryResponse = {
  data?: MyTournamentHistoryItemDto[];
  meta?: {
    pagination?: {
      kind: "cursor";
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

/**
 * Tournament history item with `id` alias.
 */
export type TournamentHistoryItem = MyTournamentHistoryItemDto & { id: string };

/**
 * Public return type. Extends `UseCursorPaginatedResult` with the tournament history item type.
 */
export type UseMyTournamentHistoryResult =
  UseCursorPaginatedResult<TournamentHistoryItem>;

/**
 * Cursor-paginated list of tournament history for the authenticated user.
 */
export function useMyTournamentHistory(
  params?: UseMyTournamentHistoryParams
): UseMyTournamentHistoryResult {
  const fetcher = useMemo(
    (): (
      args: CursorFetcherArgs<UseMyTournamentHistoryParams>
    ) => Promise<CursorPage<TournamentHistoryItem>> =>
      async ({ cursor }) => {
        try {
          const result = (await listMyTournamentHistory({
            ...(cursor ? { cursor } : {}),
            ...(params?.limit ? { limit: params.limit } : {}),
          })) as ListMyTournamentHistoryResponse;

          const items = (result.data ?? []) as MyTournamentHistoryItemDto[];
          const itemsWithId: TournamentHistoryItem[] = items.map((item) =>
            Object.assign({}, item, { id: item.tournamentId }),
          );

          const pagination = result.meta?.pagination;
          return {
            items: itemsWithId,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? itemsWithId.length,
          };
        } catch (err) {
          // 404 → treat as empty page (not an error state).
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            };
          }
          throw err;
        }
      },
    [params?.limit],
  );

  return useCursorPaginated<TournamentHistoryItem, UseMyTournamentHistoryParams>({
    key: myTournamentHistoryKey(),
    fetcher,
    params: params ?? {},
    paginationKind: "cursor",
  });
}
