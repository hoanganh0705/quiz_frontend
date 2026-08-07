"use client";

/**
 * `useSocialCounts` — fetch the aggregated social counters for a user.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.D3.
 *
 * ## What this hook owns
 *
 * - Fetch the aggregated social counters (`followers`, `following`,
 *   `friends`, `blocked`, optional pending counts) via the verified
 *   `getSocialCounts` service wrapper.
 * - Project the wire DTO through `toSocialCounts` so callers receive
 *   the canonical `SocialCountsDto` projection (with stable defaults
 *   for missing fields).
 * - Short-circuit to the safe fallback when the feature flag is
 *   `'placeholder'` so the UI does not even fire a request.
 * - Surface `{ counts, isLoading, isStale, error, retry }` per the
 *   cross-batch contract for Batch-D read hooks.
 *
 * ## SDK endpoint
 *
 * `GET /api/v1/social/counts` — returns the viewer's counters. The
 * API is currently viewer-only; the `userId` argument is therefore
 * used only for cache-key differentiation, not for routing.
 *
 * ## Server authority
 *
 * The counters are server-derived. The hook never reads from local
 * state to populate the projection; the cache is the only state.
 */

import { useCallback, useMemo } from "react";

import { useSingleWithRetry } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { toSocialCounts } from "@/features/social/dto-adapters";
import { getSocialCounts } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialCountsDto,
  type SocialErrorCode,
} from "@/features/social/types";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseSocialCountsResult {
  counts: SocialCountsDto | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
}

const PLACEHOLDER_RESULT: UseSocialCountsResult = Object.freeze({
  counts: null,
  isLoading: false,
  isStale: false,
  error: null,
  retry: () => Promise.resolve(),
});

export function useSocialCounts(userId: string | null): UseSocialCountsResult {
  const flagValue = getFeatureFlagValue("phase6_social_relationship");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    if (userId === null) return null;
    return SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId);
  }, [isFlagPlaceholder, isAuthenticated, userId]);

  const fetcher = useCallback(
    async (): Promise<SocialCountsDto> => {
      // Defensive — the key is gated, but `retry()` may fire after a
      // stale closure flipped the flag.
      if (isFlagPlaceholder) return toSocialCounts({});
      if (!isAuthenticated) return toSocialCounts({});
      try {
        const envelope = await getSocialCounts();
        return toSocialCounts(envelope?.data);
      } catch (err) {
        // 404 → no counts yet (newly registered user). Return the
        // zeroed projection so the UI can render zeros without an
        // error banner.
        const apiErr = err as Partial<ApiError> | null;
        if (apiErr && (apiErr.code === "GLOBAL_NOT_FOUND" || apiErr.status === 404)) {
          return toSocialCounts({});
        }
        throw err;
      }
    },
    [isFlagPlaceholder, isAuthenticated],
  );

  const result = useSingleWithRetry<SocialCountsDto>({ key, fetcher });

  const retry = useCallback(async () => {
    await result.retry();
  }, [result]);

  const mappedError = useMemo<ApiError | null>(() => {
    if (result.error === null) return null;
    return result.error;
  }, [result.error]);

  if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
  if (!isAuthenticated) return PLACEHOLDER_RESULT;
  if (userId === null) return PLACEHOLDER_RESULT;

  return {
    counts: result.data ?? null,
    isLoading: result.isLoading,
    isStale: false,
    error: mappedError,
    retry,
  };
}

export type SocialCountsErrorCode = SocialErrorCode;
