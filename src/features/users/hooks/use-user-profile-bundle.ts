"use client";

import { useMemo } from "react";
import {
  ApiError,
  coerceToApiError,
  isApiError,
  useSingleWithRetry,
} from "@/lib/api";
import type { SingleFetcher } from "@/lib/api/use-single-with-retry";
import { getUsers } from "@/lib/api";
import type {
  TimeSeriesDto,
  UserActivityItemDto,
  UserAnalyticsResponseDto,
  UserProfileBundleResponseDto,
  UserSummaryResponseDto,
} from "@/lib/api/generated/schemas";

export interface UseUserProfileBundleResult {
  summary: UserSummaryResponseDto | null;
  analytics: UserAnalyticsResponseDto | null;
  xpHistory: TimeSeriesDto | null;
  recentActivity: readonly UserActivityItemDto[];
  notFound: boolean;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
  if (!isApiError(err)) return false;
  return err.status === 404;
}

export function useUserProfileBundle(
  userId: string | null,
): UseUserProfileBundleResult {
  const key = useMemo(
    () =>
      userId === null ? null : (["useUserProfileBundle", userId] as const),
    [userId],
  );

  const fetcher = useMemo<SingleFetcher<UserProfileBundleResponseDto>>(
    () =>
      async ({ signal }) => {
        let response: UserProfileBundleResponseDto | null;
        try {
          const envelope = await getUsers().userControllerGetUserProfileBundle(
            userId!,
          );
          const payload =
            (envelope?.data as UserProfileBundleResponseDto | undefined) ??
            null;
          response = payload;
        } catch (err) {
          if (isApiError(err)) {
            throw err;
          }
          throw coerceToApiError(err);
        }
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        if (
          response === null ||
          typeof response !== "object" ||
          !("summary" in response)
        ) {
          throw coerceToApiError(
            new Error(
              "[useUserProfileBundle] malformed profile bundle envelope",
            ),
          );
        }
        return response;
      },
    [userId],
  );

  const bundleQuery = useSingleWithRetry<UserProfileBundleResponseDto>({
    key,
    fetcher,
  });

  const notFound =
    !bundleQuery.isLoading &&
    bundleQuery.error !== null &&
    isNotFoundError(bundleQuery.error);

  const error =
    bundleQuery.error && !isNotFoundError(bundleQuery.error)
      ? bundleQuery.error
      : null;

  const data = bundleQuery.data ?? null;

  return {
    summary: data?.summary ?? null,
    analytics: data?.analytics ?? null,
    xpHistory: data?.xpHistory ?? null,
    recentActivity: data?.recentActivity ?? [],
    notFound,
    isLoading: bundleQuery.isLoading,
    error,
    retry: bundleQuery.retry,
    isRetrying: bundleQuery.isRetrying,
  };
}
