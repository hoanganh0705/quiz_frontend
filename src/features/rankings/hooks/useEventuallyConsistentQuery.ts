"use client";

import { useCallback, useState } from "react";
import useSWR, { type SWRConfiguration } from "swr";

import { ApiError } from "@/lib/api/core/ApiError";

export type EventuallyConsistentFetcher<T> = (
key: readonly unknown[],
) => Promise<T>;

export interface UseEventuallyConsistentQueryParams<T> {
key: readonly unknown[] | null;
fetcher: EventuallyConsistentFetcher<T>;
fallbackData?: T;
swrConfig?: Omit<
SWRConfiguration<T, ApiError>,
"fetcher" | "fallbackData" | "onSuccess" | "onError"
  >;
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
swrConfig,
}: UseEventuallyConsistentQueryParams<T>): UseEventuallyConsistentQueryResult<T> {
const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

const onSuccess = useCallback(() => {
setLastValidatedAt(new Date().toISOString());
  }, []);

const onError = useCallback((err: unknown) => {

void err;
  }, []);

const swr = useSWR<T, ApiError>(key as ReadonlyArray<unknown> | null, fetcher as never, {
fallbackData: fallbackData as never,
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 2_000,
errorRetryCount: 3,
shouldRetryOnError: (err: unknown): boolean => {
if (err instanceof ApiError) {
return err.status === 429 || err.status >= 500;
      }
return false;
    },
onSuccess: onSuccess as never,
onError: onError as never,
...swrConfig,
  });

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

const data: T | null = (swr.data ?? fallbackData ?? null) as T | null;
const isStale = data !== null && swr.isValidating;
const isLoading = swr.isLoading;

return {
data,
isLoading,
error: swr.error ? coerceError(swr.error) : null,
retry: () => {
void swr.mutate();
    },
isStale,
lastValidatedAt,
mutate: () => {
void swr.mutate();
    },
  };
}