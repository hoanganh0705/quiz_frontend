/**
 * `useMyQuizzesPublished` — cursor-paginated list of the authenticated user's published quizzes.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.A4.
 *
 * Mirrors `useMyQuizzes` but calls `getMyQuizzesPublished`. SWR key uses
 * `'published'` discriminator so tab-switching resets pagination.
 *
 * ## Backend contract
 *
 * `GET /quizzes/me/published` returns quizzes that have a published version.
 * The backend filters out draft-only and soft-deleted quizzes.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { getMyQuizzesPublished } from "@/features/quizzes/services/quizzes.service";
import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";
import { myQuizzesKey } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesPublishedParams {
  /** Page size (1–100). */
  limit?: number;
}

/** Wire envelope returned by `getMyQuizzesPublished`. */
type GetMyQuizzesPublishedResponse = {
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
export type UseMyQuizzesPublishedResult = UseCursorPaginatedResult<MyQuizListItem>;

/**
 * Cursor-paginated list of the authenticated user's published quizzes.
 */
export function useMyQuizzesPublished(
  params?: UseMyQuizzesPublishedParams,
): UseMyQuizzesPublishedResult {
  const fetcher = useMemo(
    (): (args: CursorFetcherArgs<UseMyQuizzesPublishedParams>) => Promise<CursorPage<MyQuizListItem>> =>
      async ({ cursor, signal }) => {
        try {
          const result = (await getMyQuizzesPublished({
            cursor: cursor ?? undefined,
            limit: params?.limit,
          })) as unknown as GetMyQuizzesPublishedResponse;

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

  return useCursorPaginated<MyQuizListItem, UseMyQuizzesPublishedParams>({
    key: myQuizzesKey("published"),
    fetcher,
    params: params ?? {},
    paginationKind: "cursor",
  });
}
