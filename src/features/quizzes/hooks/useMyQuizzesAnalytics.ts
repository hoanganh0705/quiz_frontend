'use client';

/**
 * `useMyQuizzesAnalytics` — single-fetch hook for the author's aggregate analytics.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.A5.
 *
 * Wraps `getMyQuizAnalytics` in a simple `useSWR` hook. Unlike the list hooks,
 * this is NOT paginated — it's a single `GET /quizzes/me/analytics` call.
 *
 * ## 404 → null contract
 *
 * When the user has no published quizzes, the backend returns 404.
 * The hook catches this and returns `analytics: null` so the UI can render
 * the "No activity yet" placeholder instead of an error state.
 *
 * ## 5xx propagation
 *
 * 5xx errors propagate as `ApiError` so the error boundary can handle them.
 * The hook does NOT swallow server errors.
 *
 * ## SWR key
 *
 * The key is `['quizzes', 'me', 'analytics']`.
 */

import useSWR from "swr";

import { ApiError } from "@/lib/api";

import { getMyQuizAnalytics } from "@/features/quizzes/services/quizzes.service";
import type { MyQuizzesAnalytics } from "@/features/quizzes/types/my-quizzes";
import { myQuizzesKey } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesAnalyticsResult {
  /** The analytics data, or `null` while loading or when the user has no published quizzes. */
  analytics: MyQuizzesAnalytics | null;
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
  /** True while revalidating (including on focus). */
  isValidating: boolean;
  /** The error, or `null` on success or 404. */
  error: ApiError | null;
}

/**
 * Single-fetch hook for the author's aggregate analytics.
 *
 * @example
 * ```tsx
 * const { analytics, isLoading } = useMyQuizzesAnalytics();
 * if (isLoading) return <MyQuizzesAnalyticsSkeleton />;
 * if (!analytics) return <MyQuizzesAnalyticsEmpty />;
 * return <MyQuizzesAnalyticsTab analytics={analytics} />;
 * ```
 */
export function useMyQuizzesAnalytics(): UseMyQuizzesAnalyticsResult {
  const { data, error, isLoading, isValidating } = useSWR<
    MyQuizzesAnalytics,
    ApiError
  >(
    myQuizzesKey("analytics"),
    async () => {
      const result = await getMyQuizAnalytics();
      return result.data as MyQuizzesAnalytics;
    },
    {
      // Inherit the global SwrProvider defaults.
    },
  );

  // Normalise 404 → null without surfacing an error.
  const normalisedError =
    error instanceof ApiError && error.status === 404 ? null : error;

  return {
    analytics: data ?? null,
    isLoading,
    isValidating,
    error: normalisedError ?? null,
  };
}
