"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api/core/ApiError";

export type EventuallyConsistentFetcher<T> = (
  key: readonly unknown[],
) => Promise<T>;

export interface UseEventuallyConsistentQueryParams<T> {
  key: readonly unknown[] | null;
  fetcher: EventuallyConsistentFetcher<T>;
  fallbackData?: T;
  swrConfig?: Record<string, unknown>;
}

export interface UseEventuallyConsistentQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => void;
  isStale: boolean;
  lastValidatedAt: string | null;
  mutate: () => void;
}

function coerceError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) {
    return new ApiError({
      isAxiosError: true,
      name: "ApiError",
      message: err.message,
      response: {
        status: 500,
        statusText: "Internal Server Error",
        data: {
          status: 500,
          title: "Internal Server Error",
          extensions: { code: "GLOBAL_INTERNAL_ERROR" },
        },
      },
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  throw err;
}

export function useEventuallyConsistentQuery<T>({
  key,
  fetcher,
  fallbackData,
}: UseEventuallyConsistentQueryParams<T>): UseEventuallyConsistentQueryResult<T> {
  const enabled = key !== null;

  const query = useQuery<T, unknown>(
    {
      queryKey: (key ?? [
        "__eventually_consistent_query_disabled__",
      ]) as readonly unknown[],
      queryFn: async (): Promise<T> => {
        if (!key) throw new Error("Key is null");
        return fetcher(key);
      },
      enabled,
      initialData: fallbackData,
      initialDataUpdatedAt: 0,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        if (error instanceof ApiError) {
          return error.status === 429 || error.status >= 500;
        }
        return false;
      },
    },
    getQueryClient(),
  );

  if (key === null) {
    return {
      data: fallbackData ?? null,
      isLoading: false,
      error: null,
      retry: () => {
        /* no-op */
      },
      isStale: false,
      lastValidatedAt: null,
      mutate: () => {
        /* no-op */
      },
    };
  }

  const data: T | null = (query.data ?? fallbackData ?? null) as T | null;
  const isStale = data !== null && query.isFetching;
  const isLoading = query.isLoading;
  const lastValidatedAt =
    query.dataUpdatedAt > 0
      ? new Date(query.dataUpdatedAt).toISOString()
      : null;

  return {
    data,
    isLoading,
    error: query.error ? coerceError(query.error) : null,
    retry: () => {
      void query.refetch();
    },
    isStale,
    lastValidatedAt,
    mutate: () => {
      void query.refetch();
    },
  };
}
