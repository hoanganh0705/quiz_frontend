/**
 * `useMyQuizzes` — cursor-paginated list of the authenticated user's quizzes.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.A2.
 *
 * Wraps `getMyQuizzes` from `quizzes.service.ts` in `useCursorPaginated`.
 *
 * ## Fetcher adapter
 *
 * The fetcher reads `cursor`, calls `getMyQuizzes`, and:
 *   1. Unwraps the wire envelope `{ data, meta }` to `CursorPage<MyQuizListItem>`.
 *   2. Synthesises `id` from `quizId` so `appendUniqueById` deduplication works.
 *   3. Returns `ApiError(404)` as an empty page (not thrown).
 *
 * ## SWR key
 *
 * The key is `['quizzes', 'me', 'all']`. Changing the key resets pagination.
 *
 * ## `id` aliasing
 *
 * `QuizListItemDto` carries `quizId`. The cursor primitive requires `T extends { id: string }`.
 * The fetcher synthesises `id = quizId` here — the only place this aliasing happens.
 * Downstream components read `quizId` directly.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { getMyQuizzes } from "@/features/quizzes/services/quizzes.service";
import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";
import { myQuizzesKey } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesParams {
  /** Page size (1–100). */
  limit?: number;
}

/** Wire envelope returned by `getMyQuizzes` (post-unwrap). */
type GetMyQuizzesResponse = {
  data?: Array<MyQuizListItem & { [k: string]: unknown }>;
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
 * Public return type of `useMyQuizzes`. Extends `UseCursorPaginatedResult`
 * with the `MyQuizListItem` item type.
 */
export type UseMyQuizzesResult = UseCursorPaginatedResult<MyQuizListItem>;

/**
 * Cursor-paginated list of the authenticated user's quizzes (all statuses).
 */
export function useMyQuizzes(
  params?: UseMyQuizzesParams,
): UseMyQuizzesResult {
  const fetcher = useMemo(
    (): (args: CursorFetcherArgs<UseMyQuizzesParams>) => Promise<CursorPage<MyQuizListItem>> =>
      async ({ cursor, signal }) => {
        try {
          const result = (await getMyQuizzes({
            cursor: cursor ?? undefined,
            limit: params?.limit,
          })) as unknown as GetMyQuizzesResponse;

          const items = (result.data ?? []) as MyQuizListItem[];
          // Synthesise `id` alias of `quizId` — the only place this aliasing
          // happens. Downstream components read `quizId` directly.
          const itemsWithId: MyQuizListItem[] = items.map((item) =>
            Object.assign({}, item, { id: item.quizId }),
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

  return useCursorPaginated<MyQuizListItem, UseMyQuizzesParams>({
    key: myQuizzesKey("all"),
    fetcher,
    params: params ?? {},
    paginationKind: "cursor",
  });
}
