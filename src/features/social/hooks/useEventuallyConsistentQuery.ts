"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR, { type SWRConfiguration } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";

export interface EventuallyConsistentEnvelope {

staleAt?: string;

isStale?: boolean;
}

export type StalenessSource = "stale_at" | "is_stale_flag" | "none";

export interface UseEventuallyConsistentQueryOptions {

staleAfterMs?: number;

swrConfig?: SWRConfiguration;
}

export interface UseEventuallyConsistentQueryResult<T> {
data: T | null;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
retry: () => void;
staleness: ConsistencyStaleness;

stalenessSource: StalenessSource;
}

const DEFAULT_STALE_AFTER_MS = 60_000;

function coerceToApiError(err: unknown): ApiError {
if (isApiError(err)) return err;
if (
typeof err === "object" &&
err !== null &&
("isAxiosError" in err || (err as { response?: unknown }).response)
  ) {
return ApiError.fromAxios(
err as Parameters<typeof ApiError.fromAxios>[0],
    );
  }

const fallback = new ApiError({
status: 0,
code: "GLOBAL_INTERNAL_ERROR",
message:
err instanceof Error ? err.message : "Unknown error from fetcher",
  } as unknown as ConstructorParameters<typeof ApiError>[0]);
if (err instanceof Error && err.stack) {
(fallback as { cause?: unknown }).cause = err;
  }
return fallback;
}

export function resolveStaleness(
payload: unknown,
nowMs: number,
staleAfterMs: number,
): {
staleness: ConsistencyStaleness;
source: StalenessSource;
} {
if (
payload !== null &&
typeof payload === "object" &&
"isStale" in payload &&
typeof (payload as { isStale: unknown }).isStale === "boolean"
  ) {
const flag = (payload as { isStale: boolean }).isStale;
return {
staleness: flag ? "stale" : "recent",
source: "is_stale_flag",
    };
  }
if (
payload !== null &&
typeof payload === "object" &&
"staleAt" in payload &&
typeof (payload as { staleAt: unknown }).staleAt === "string"
  ) {
const stamp = (payload as { staleAt: string }).staleAt;
const ts = Date.parse(stamp);
if (Number.isFinite(ts)) {
return {
staleness: nowMs - ts > staleAfterMs ? "stale" : "recent",
source: "stale_at",
      };
    }

return { staleness: "recent", source: "stale_at" };
  }
return { staleness: "recent", source: "none" };
}

export function useEventuallyConsistentQuery<T>(
key: readonly unknown[] | null,
fetcher: () => Promise<T>,
options: UseEventuallyConsistentQueryOptions = {},
): UseEventuallyConsistentQueryResult<T> {
const { staleAfterMs = DEFAULT_STALE_AFTER_MS, swrConfig } = options;

const [retryTick, setRetryTick] = useState(0);
const effectiveKey = useMemo<readonly unknown[] | null>(() => {
if (key === null) return null;
if (retryTick === 0) return key;
return [...key, "__retry__", retryTick] as const;
  }, [key, retryTick]);

const resolvedConfig: SWRConfiguration = useMemo<SWRConfiguration>(
() => ({
revalidateOnFocus: false,
revalidateIfStale: false,
...swrConfig,
    }),
[swrConfig],
  );

const { data, error, isLoading, isValidating } = useSWR<T, unknown>(
effectiveKey,
async (): Promise<T> => fetcher(),
resolvedConfig,
  );

const isStale = Boolean(data) && Boolean(isValidating);

const coercedError = useMemo<ApiError | null>(() => {
if (!error) return null;
return coerceToApiError(error);
  }, [error]);

const { staleness, source } = useMemo(() => {

return resolveStaleness(data, Date.now(), staleAfterMs); // eslint-disable-line react-hooks/purity
  }, [data, staleAfterMs]);

const retry = useCallback(() => {
setRetryTick((tick) => tick + 1);
  }, []);

return {
data: data ?? null,
isLoading: Boolean(isLoading) && !data,
isStale,
error: coercedError,
retry,
staleness,
stalenessSource: source,
  };
}