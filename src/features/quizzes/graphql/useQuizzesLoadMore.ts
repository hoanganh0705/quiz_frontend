/**
 * `useQuizzesLoadMore` — cursor pagination helper for `useQuizzesBundleQuery`.
 *
 * Apollo's `fetchMore` API returns the next page but does NOT merge it into
 * the cached result by itself. This hook pairs with `useQuizzesBundleQuery`
 * so the caller hands in the `fetchMore` function and the current
 * `pageInfo` cursor; the returned `loadMore` callback (a) calls
 * `fetchMore({ variables: { cursor: pageInfo.nextCursor }, updateQuery })`
 * to pull the next page and append its items into the existing list, and
 * (b) flips an `isLoadingMore` flag for the duration of the round-trip.
 *
 * Behaviour contract:
 *   - `loadMore` is a no-op when `hasNextPage` is false or the cursor is null.
 *   - `loadMore` is a no-op while `isLoadingMore` is true (in-flight guard).
 *   - The cache update is purely additive: existing items are preserved
 *     in order; the fetched page is appended to the end of the items array.
 *   - The hook never throws — the fetch promise is consumed internally and
 *     surfaced as `error` so the page can show the existing items + a
 *     retry surface, matching the SWR `useCursorPaginated` error contract.
 */
'use client';

import { useCallback, useState } from 'react';
import type { OperationVariables } from '@apollo/client';
import type { ObservableQuery } from '@apollo/client';

import { ApiError, coerceToApiError } from '@/lib/api';

/**
 * Local concrete shape for the `quizzesBundle` payload. The placeholder
 * generated type (`Record<string, unknown>`) collapses nested fields to
 * `unknown`, so the hook pins the surface it actually consumes here.
 * The next codegen run replaces the placeholder with the real generated
 * shape and the hook's outer contract stays stable.
 */
export interface QuizzesBundlePayload {
  readonly quizzesBundle?: BundleShape | null;
}

export interface BundleShape {
  readonly items?: readonly BundleItem[] | null;
  readonly pageInfo?: BundlePageInfo | null;
  readonly popular?: readonly BundlePopular[] | null;
  readonly trending?: readonly BundleTrending[] | null;
  readonly categories?: readonly BundleCategory[] | null;
  readonly tags?: readonly BundleTag[] | null;
}

export interface BundleItem {
  readonly quizId: string;
  readonly slug: string;
  readonly title: string;
  readonly description?: string | null;
  readonly imageUrl?: string | null;
  readonly difficulty?: { readonly label: string } | string | null;
  readonly category?: {
    readonly categoryId: string;
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly tags?: readonly {
    readonly tagId: string;
    readonly slug: string;
    readonly name: string;
  }[];
}

export interface BundlePageInfo {
  readonly hasNextPage: boolean;
  readonly nextCursor?: string | null;
  readonly limit: number;
}

export interface BundlePopular {
  readonly rank: number;
  readonly quizId: string;
  readonly title: string;
  readonly slug: string;
  readonly imageUrl?: string | null;
  readonly popularityScore: number;
  readonly totalAttempts: number;
}

export interface BundleTrending {
  readonly rank: number;
  readonly quizId: string;
  readonly title: string;
  readonly slug: string;
  readonly imageUrl?: string | null;
  readonly trendingScore: number;
  readonly totalAttempts: number;
}

export interface BundleCategory {
  readonly rank: number;
  readonly categoryId: string;
  readonly name: string;
  readonly slug: string;
}

export interface BundleTag {
  readonly rank: number;
  readonly tagId: string;
  readonly name: string;
  readonly slug: string;
}

type Bundle = NonNullable<QuizzesBundlePayload['quizzesBundle']>;
export type QuizzesBundlePageInfo = NonNullable<Bundle['pageInfo']>;
export type QuizzesBundleItems = NonNullable<Bundle['items']>;

export interface UseQuizzesLoadMoreArgs<
  TFetchVars extends OperationVariables = OperationVariables,
> {
  readonly pageInfo: QuizzesBundlePageInfo | null | undefined;
  readonly fetchMore: (
    options: ObservableQuery.FetchMoreOptions<QuizzesBundlePayload, TFetchVars>,
  ) => Promise<unknown>;
  readonly baseVariables: TFetchVars;
}

export interface UseQuizzesLoadMoreResult {
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly error: ApiError | null;
  readonly loadMore: () => void;
  readonly reset: () => void;
}

export function useQuizzesLoadMore<
  TFetchVars extends OperationVariables = OperationVariables,
>({
  pageInfo,
  fetchMore,
  baseVariables,
}: UseQuizzesLoadMoreArgs<TFetchVars>): UseQuizzesLoadMoreResult {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const hasMore = Boolean(pageInfo?.hasNextPage);
  const nextCursor = pageInfo?.nextCursor ?? null;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    if (nextCursor === null) return;
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    void fetchMore({
      variables: {
        ...(baseVariables ?? {}),
        cursor: nextCursor,
      } as TFetchVars,
      updateQuery: (
        previous: QuizzesBundlePayload,
        { fetchMoreResult }: { fetchMoreResult: QuizzesBundlePayload | null | undefined },
      ) => {
        if (!fetchMoreResult) return previous;
        const previousBundle = previous.quizzesBundle as Bundle | undefined | null;
        const nextBundle = fetchMoreResult.quizzesBundle as Bundle | undefined | null;
        if (!previousBundle || !nextBundle) return previous;

        const previousItems = Array.isArray(previousBundle.items)
          ? (previousBundle.items as QuizzesBundleItems)
          : [];
        const nextItems = Array.isArray(nextBundle.items)
          ? (nextBundle.items as QuizzesBundleItems)
          : [];

        return {
          ...fetchMoreResult,
          quizzesBundle: {
            ...nextBundle,
            items: [...previousItems, ...nextItems],
          },
        };
      },
    })
      .then(() => {
        setIsLoadingMore(false);
      })
      .catch((err: unknown) => {
        setError(toApiError(err));
        setIsLoadingMore(false);
      });
  }, [hasMore, nextCursor, isLoadingMore, fetchMore, baseVariables]);

  const reset = useCallback(() => {
    setError(null);
    setIsLoadingMore(false);
  }, []);

  return { hasMore, isLoadingMore, error, loadMore, reset };
}

/**
 * Coerce whatever `fetchMore` rejected with into a typed `ApiError`. The
 * GraphQL error link (see `client.ts`) already does this for transport-
 * level failures, so this path mostly catches programming mistakes (e.g.
 * a thrown non-Error value from a custom link).
 */
function toApiError(cause: unknown): ApiError {
  return coerceToApiError(cause);
}
