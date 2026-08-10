/**
 * `useMyAttempts` — cursor-paginated quiz attempts for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B8.
 *
 * Wraps `listMyAttempts` from `attempts.service.ts` in `useCursorPaginated`.
 * This is separate from the authored-quizzes tab (story 4.4).
 *
 * ## Fetcher adapter
 *
 * The fetcher reads `cursor`, calls the service, and:
 *   1. Unwraps the wire envelope `{ data, meta }` to `CursorPage<AttemptSummary>`.
 *   2. Synthesises `id` from `attemptId` so `appendUniqueById` deduplication works.
 *
 * ## SWR key
 *
 * The key is `['attempts', 'me']`. Changing the key resets pagination.
 */

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { listMyAttempts } from "@/features/attempts/services/attempts.service";
import { myAttemptsKey } from "@/features/users/types/user-analytics.types";
import type { AttemptSummaryResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyAttemptsParams {
  limit?: number;
}

/** Wire envelope returned by `listMyAttempts` (post-unwrap). */
type ListMyAttemptsResponse = {
  data?: AttemptSummaryResponseDto[];
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
 * Attempt summary with `id` alias.
 */
export type AttemptSummary = AttemptSummaryResponseDto & { id: string };

/**
 * Public return type. Extends `UseCursorPaginatedResult` with the attempt summary item type.
 */
export type UseMyAttemptsResult = UseCursorPaginatedResult<AttemptSummary>;

/**
 * Cursor-paginated list of quiz attempts for the authenticated user.
 */
export function useMyAttempts(
  params?: UseMyAttemptsParams
): UseMyAttemptsResult {
  const fetcher = useMemo(
    (): (args: CursorFetcherArgs<UseMyAttemptsParams>) => Promise<CursorPage<AttemptSummary>> =>
      async ({ cursor }) => {
        try {
          const raw = await listMyAttempts({
            ...(cursor ? { cursor } : {}),
            ...(params?.limit ? { limit: params.limit } : {}),
          });
          const result = raw as unknown as ListMyAttemptsResponse;

          const items = (result.data ?? []) as AttemptSummaryResponseDto[];
          const itemsWithId = projectWithId(items as unknown as readonly Record<string, unknown>[], 'attemptId') as unknown as AttemptSummary[];

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

  return useCursorPaginated<AttemptSummary, UseMyAttemptsParams>({
    key: myAttemptsKey(),
    fetcher,
    params: params ?? {},
    paginationKind: "cursor",
  });
}
