/**
 * `useQuizVersions` — paginated list of quiz versions.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.2.
 *
 * Wraps `getQuizVersions` from `quizzes.service.ts` in `useCursorPaginated`.
 *
 * ## Fetcher adapter
 *
 * The fetcher reads `cursor`, calls `getQuizVersions`, and:
 *   1. Unwraps the wire envelope `{ data, meta }` to `CursorPage<QuizVersionSummary>`.
 *   2. Synthesizes `id` alias from `quizVersionId` for cursor pagination.
 *   3. Returns `ApiError(404)` as an empty page (not thrown).
 *
 * ## SWR key
 *
 * `['quiz', 'versions', quizId, filters]`
 *
 * ## Pagination
 *
 * This hook uses cursor-based pagination. Call `loadMore()` to fetch the
 * next page; the hook appends new items to the existing list.
 */

'use client';

import { useMemo } from 'react';

import { ApiError, useCursorPaginated } from '@/lib/api';
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import { getQuizVersions } from '@/features/quizzes/services/quizzes.service';
import {
  quizVersionsKey,
  type QuizVersionSummary,
} from '@/features/quizzes/types/quiz-version.types';

export interface UseQuizVersionsParams {
  /** Quiz ID to fetch versions for. */
  quizId: string;
  /** Page size (1–100). */
  limit?: number;
}

export interface UseQuizVersionsFilters {
  status?: 'draft' | 'published';
}

/** Wire envelope returned by `getQuizVersions` (post-unwrap). */
type GetQuizVersionsResponse = {
  data?: Array<{ quizVersionId: string } & Omit<QuizVersionSummary, 'quizVersionId'>>;
  meta?: {
    pagination?: {
      kind: 'cursor';
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

/**
 * Public return type of `useQuizVersions`. Extends `UseCursorPaginatedResult`
 * with the `QuizVersionSummary` item type.
 */
export type UseQuizVersionsResult = UseCursorPaginatedResult<QuizVersionSummary>;

function buildFilters(): UseQuizVersionsFilters {
  return {};
}

/**
 * Cursor-paginated list of quiz versions.
 *
 * @example
 * ```tsx
 * const { items, isLoading, isLoadingMore, hasMore, loadMore, refresh } = useQuizVersions({
 *   quizId: 'uuid',
 * });
 *
 * return (
 *   <>
 *     {items.map(version => <VersionItem key={version.quizVersionId} version={version} />)}
 *     {hasMore && <button onClick={loadMore}>Load more</button>}
 *   </>
 * );
 * ```
 */
export function useQuizVersions(
  params: UseQuizVersionsParams,
): UseCursorPaginatedResult<QuizVersionSummary> {
  const filters = useMemo(() => buildFilters(), []);

  const fetcher = useMemo(
    (): (args: CursorFetcherArgs<UseQuizVersionsParams>) => Promise<CursorPage<QuizVersionSummary>> =>
      async ({ cursor, signal: _signal }) => {
        const startedAt = Date.now();

        try {
          const result = (await getQuizVersions(params.quizId, {
            cursor: cursor ?? undefined,
            limit: params.limit,
          })) as unknown as GetQuizVersionsResponse;

          emitBreadcrumb('phase4:4.9:versions-list', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          // Map response to our type, synthesizing `id` from `quizVersionId`
          const items: readonly QuizVersionSummary[] = (result.data ?? []).map(
            (item) => ({ ...item, id: item.quizVersionId }) as QuizVersionSummary,
          );

          const pagination = result.meta?.pagination;

          return {
            items,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? items.length,
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
          if (err instanceof Error && err.name === 'AbortError') {
            throw err;
          }
          emitBreadcrumb('phase4:4.9:versions-list', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: err instanceof ApiError ? err.code : 'GLOBAL_UNKNOWN',
          });
          throw err;
        }
      },
    [params.quizId, params.limit],
  );

  const key: readonly unknown[] = ['quiz', 'versions', params.quizId];

  return useCursorPaginated<QuizVersionSummary, UseQuizVersionsParams>({
    key,
    fetcher,
    params: params,
    paginationKind: 'cursor',
  });
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (TKT-4.9.2): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}
