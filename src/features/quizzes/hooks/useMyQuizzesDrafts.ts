/**
 * `useMyQuizzesDrafts` — cursor-paginated list of the authenticated user's draft quizzes.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.A3.
 *
 * Mirrors `useMyQuizzes` but calls `getMyQuizzesDrafts`. SWR key uses
 * `'drafts'` discriminator so tab-switching resets pagination.
 *
 * ## Backend contract
 *
 * `GET /quizzes/me/drafts` returns quizzes that have an unpublished version.
 * The backend filters out published-only quizzes.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { getMyQuizzesDrafts } from "@/features/quizzes/services/quizzes.service";
import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";
import { myQuizzesKey } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesDraftsParams {
  /** Page size (1–100). */
  limit?: number;
}

/** Wire envelope returned by `getMyQuizzesDrafts`. */
type GetMyQuizzesDraftsResponse = {
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

/** Public return type. */
export type UseMyQuizzesDraftsResult = UseCursorPaginatedResult<MyQuizListItem>;

/**
 * Cursor-paginated list of the authenticated user's draft quizzes.
 */
export function useMyQuizzesDrafts(
  params?: UseMyQuizzesDraftsParams,
): UseMyQuizzesDraftsResult {
  const fetcher = useMemo(
    (): (args: CursorFetcherArgs<UseMyQuizzesDraftsParams>) => Promise<CursorPage<MyQuizListItem>> =>
      async ({ cursor, signal }) => {
        try {
          const result = (await getMyQuizzesDrafts({
            cursor: cursor ?? undefined,
            limit: params?.limit,
          })) as unknown as GetMyQuizzesDraftsResponse;

          const items = (result.data ?? []) as MyQuizListItem[];
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

  return useCursorPaginated<MyQuizListItem, UseMyQuizzesDraftsParams>({
    key: myQuizzesKey("drafts"),
    fetcher,
    params: params ?? {},
    paginationKind: "cursor",
  });
}
