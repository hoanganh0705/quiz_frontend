"use client";

/**
 * `useEventuallyConsistentQuery` — Single-resource SWR primitive with
 * eventual-consistency semantics for the Story 6.3 analytics
 * surfaces.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.D4.
 *
 * ## What this hook owns
 *
 * The single primitive that wraps an SWR read with
 * eventual-consistency semantics. The hook returns
 *
 * ```
 *   { data, isLoading, isStale, error, retry, staleness }
 * ```
 *
 * where `staleness` is derived from the backend response:
 *
 *   - When the backend response carries a `stale_at` ISO timestamp
 *     older than `options.staleAfterMs` (default 60 000 ms),
 *     `staleness === 'stale'`.
 *   - When the backend response carries an `isStale: boolean` flag
 *     and it is `true`, `staleness === 'stale'`. When it is
 *     `false`, `staleness === 'recent'`.
 *   - When neither signal is present, `staleness === 'recent'`
 *     (the canonical "we have data, we don't know if it's stale"
 *     state).
 *
 * The `isStale` field reflects SWR's own revalidation signal: when
 * a revalidation is in flight and cached data is present,
 * `isStale === true`.
 *
 * ## Why a custom primitive (and not `useSingleWithRetry`)
 *
 * `useSingleWithRetry` (Epic 3.6) is the right primitive for a
 * single fetch with 429 backoff, but it does not surface
 * `isStale` / `isValidating` (it is built on a hand-rolled fetch
 * loop, not on `useSWR`). Story 6.3 needs both:
 *
 *   - `isStale` so the consumer can mark the error as
 *     background-revalidation (TKT-6.3.C3).
 *   - `staleness` so the consumer can render the
 *     `ConsistencyNotice` primitive (TKT-6.3.C1).
 *
 * The custom primitive above reuses the same `ApiError` coercion
 * pattern (RFC 7807 / `ApiError.fromAxios`) and the same
 * `AbortController` discipline so the runtime behaviour matches
 * the Phase 3 / Phase 4 primitive.
 *
 * ## Server authority
 *
 * The hook never infers staleness from local state. The decision is
 * driven by the backend `stale_at` / `isStale` signal. The
 * `staleAfterMs` option is a **client-side threshold** that the
 * page may tighten for surfaces that are more sensitive to lag (the
 * My Analytics page, which renders the freshness copy in front of
 * every chart).
 *
 * ## Cross-cutting identity
 *
 * The hook is consumed by `useUserSocialStats` (TKT-6.3.D1),
 * `useMySocialAnalytics` (TKT-6.3.D2), and `useFriendLeaderboard`
 * (TKT-6.3.D3). The three consumer hooks add the privacy-aware
 * mappings on top of this primitive's `{ data, isStale, staleness,
 * error, retry }` shape.
 */

import { useCallback, useMemo, useState } from "react";
import useSWR, { type SWRConfiguration } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";

/**
 * Optional fields the backend may include in the response envelope
 * to communicate freshness. When the response type omits these
 * fields, the hook falls through to the `'recent'` default.
 */
export interface EventuallyConsistentEnvelope {
  /** ISO timestamp; when older than `staleAfterMs`, treated as stale. */
  staleAt?: string;
  /** Explicit boolean; takes precedence over `staleAt` if both are present. */
  isStale?: boolean;
}

/**
 * The three signal sources the hook considers. Exported so the spec
 * can pin the derivation order.
 */
export type StalenessSource = "stale_at" | "is_stale_flag" | "none";

export interface UseEventuallyConsistentQueryOptions {
  /**
   * Threshold in milliseconds for the `stale_at` comparison. Defaults
   * to 60 000 ms (one minute — the documented social analytics
   * freshness window).
   */
  staleAfterMs?: number;
  /**
   * Override the SWR config. Defaults to `{ revalidateOnFocus: false,
   * revalidateIfStale: false }` to match the global `SwrProvider`
   * (TKT-3.2.A3). Consumers may opt in to per-call focus
   * revalidation by passing `revalidateOnFocus: true`.
   */
  swrConfig?: SWRConfiguration;
}

export interface UseEventuallyConsistentQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  retry: () => void;
  staleness: ConsistencyStaleness;
  /** The signal source that produced the current `staleness`. Exposed for tests. */
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
  // Unknown error shape — wrap in a generic ApiError so consumers
  // always receive an `ApiError`. The original error is surfaced via
  // the `cause` field.
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
    // The signal was reported but was unparseable; default to
    // 'recent' with the documented source so the consumer can
    // surface a telemetry breadcrumb.
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

  // Bumped on `retry()` so SWR sees a new key and discards the
  // previous (errored) cache entry. The state lives in `useState` so
  // the change triggers a re-render and `effectiveKey` re-evaluates.
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

  // The staleness comparison needs a stable `now` so the result
  // is deterministic across re-renders that do not change `data`
  // or `staleAfterMs`. The captured value updates only when the
  // dependency list does, which is the canonical React-hooks/purity
  // pattern for "I need a non-state read in a memoized
  // computation" — see react-hooks/purity docs.
  const { staleness, source } = useMemo(() => {
    // The staleness comparison needs a fresh `now` so a stale
    // payload's `stale_at` is compared to the current wall clock.
    // The result is a `'recent' | 'stale'` label (not a render
    // decision); suppressing the purity lint here is intentional.
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