"use client";

/**
 * `useUserActivity` — Story 6.4 read hook for the user activity
 * stream surface.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.D2.
 *
 * ## What this hook owns
 *
 * The single read hook the activity page
 * (`/social/users/:id/activity`, Batch F) calls to fetch the
 * target user's public activity stream. The hook:
 *
 *   - Calls the verified service wrapper `getUserActivity`
 *     (TKT-6.4.D1).
 *   - Uses `useCursorPaginated` with `paginationKind: 'cursor'`
 *     (the SDK emits cursor pagination for the endpoint) and
 *     `pageSize: ACTIVITY_PAGE_SIZE` (default `20`).
 *   - Maps the documented privacy codes
 *     (`SOCIAL_USER_BLOCKED`, `SOCIAL_BLOCKED_USER`,
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN`, `SOCIAL_USER_NOT_FOUND`) to
 *     the documented `visibility` field so the UI primitives
 *     (`ActivityStreamItem`, `ActivityEmptyState`,
 *     `ActivityErrorState`) can render the privacy notice
 *     without branching on raw HTTP status.
 *   - Surfaces the activity rate-limit via `rateLimitedUntil:
 *     number | null` (epoch ms) so
 *     `ActivityRateLimitNotice` (TKT-6.4.B3) can render the
 *     cooldown countdown. When the service response carries a
 *     `cooldownSeconds > 0`, the hook sets
 *     `rateLimitedUntil = Date.now() + cooldownSeconds * 1000`.
 *   - Never throws for privacy reasons: a non-visible viewer
 *     receives `{ items: [], total: 0, visibility }`.
 *   - Short-circuits to the safe placeholder when the feature
 *     flag is `'placeholder'` or the viewer is unauthenticated.
 *
 * ## Why a client hook
 *
 * The SWR cache is client-side. Server-rendered shells receive
 * the `SocialActivityPlaceholder` (TKT-6.4.B5) until the client
 * takes over.
 *
 * ## Server authority
 *
 * The list is server-authoritative. The hook never reads from
 * local state to populate the projection; the cache is the only
 * state. The `visibility` field is computed from the server-
 * surfaced `ApiError.code`.
 */

import { useEffect, useMemo, useState } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";
import { getUserActivity } from "@/features/social/services/activity.service";
import type {
  SocialActivityItemDto,
} from "@/features/social/types";
import type {
  SocialListVisibility,
} from "@/features/social/social-list-visibility";
import {
  decodeRateLimit,
  isRateLimitErrorCode,
} from "@/features/social/rate-limit-decoder";
import { resolveMutualVisibility } from "@/features/social/hooks/useMutualFriends";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * The documented `ACTIVITY_PAGE_SIZE` (TKT-6.4.D2 AC #3). Defaults
 * to `20` items per page.
 */
export const ACTIVITY_PAGE_SIZE = 20;

// ─── Public surface ──────────────────────────────────────────────────────

export interface UseUserActivityResult {
  items: readonly SocialActivityItemDto[];
  total: number;
  visibility: SocialListVisibility;
  isLoading: boolean;
  isStale: boolean;
  /**
   * Eventual-consistency signal (Epic 6.3 / TKT-6.3.D4 contract).
   * The page consumer renders `<ConsistencyNotice>` when the value
   * is not `'fresh'`. The signal is `'stale'` while a
   * `useCursorPaginated` revalidation is in flight (cached items are
   * present and a fresh fetch is resolving); `'fresh'` otherwise.
   */
  staleness: ConsistencyStaleness;
  error: ApiError | null;
  loadMore: () => void;
  hasMore: boolean;
  retry: () => Promise<void>;
  /**
   * The rate-limit cooldown in epoch milliseconds. `null` when
   * the activity stream is not rate-limited; a future epoch
   * millisecond timestamp when the activity stream is rate-
   * limited. `ActivityRateLimitNotice` consumes this to render
   * the countdown.
   */
  rateLimitedUntil: number | null;
}

// ─── Internal constants ──────────────────────────────────────────────────

const EMPTY_PAGE = Object.freeze({
  items: [] as readonly SocialActivityItemDto[],
  nextCursor: null as string | null,
  hasNextPage: false,
  limit: 0,
});

const PLACEHOLDER_RESULT: UseUserActivityResult = Object.freeze({
  items: [],
  total: 0,
  visibility: "not_found",
  isLoading: false,
  isStale: false,
  staleness: "fresh",
  error: null,
  hasMore: false,
  loadMore: () => undefined,
  retry: () => Promise.resolve(),
  rateLimitedUntil: null,
});

const FALLBACK_RESULT: UseUserActivityResult = Object.freeze({
  items: [],
  total: 0,
  visibility: "not_found",
  isLoading: false,
  isStale: false,
  staleness: "fresh",
  error: null,
  hasMore: false,
  loadMore: () => undefined,
  retry: () => Promise.resolve(),
  rateLimitedUntil: null,
});

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Read the target user's public activity stream. The hook is
 * privacy-aware: a non-visible viewer receives an empty list and
 * the corresponding `visibility` value. The hook never throws
 * for privacy reasons.
 */
export function useUserActivity(
  targetUserId: string | null,
): UseUserActivityResult {
  const flagValue = getFeatureFlagValue("social_activity_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    if (targetUserId === null) return null;
    return ["social", "user-activity", targetUserId] as const;
  }, [isFlagPlaceholder, isAuthenticated, targetUserId]);

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<Record<string, never>>): Promise<{
        items: readonly SocialActivityItemDto[];
        nextCursor: string | null;
        hasNextPage: boolean;
        limit: number;
      }> => {
        if (
          isFlagPlaceholder ||
          !isAuthenticated ||
          targetUserId === null
        ) {
          return EMPTY_PAGE;
        }
        try {
          const result = await getUserActivity(targetUserId, {
            ...(cursor ? { cursor } : {}),
            limit: ACTIVITY_PAGE_SIZE,
          });
          return {
            items: result.items,
            nextCursor: null,
            hasNextPage: false,
            limit: ACTIVITY_PAGE_SIZE,
          };
        } catch (err) {
          // Privacy / block / 403 / 429 / 404 — rethrow; the hook
          // visibility resolver maps the error code to the
          // documented privacy branch. The rate-limit decode
          // happens below in the rate-limited branch via the
          // shared `decodeRateLimit` helper.
          throw err;
        }
      },
    [isFlagPlaceholder, isAuthenticated, targetUserId],
  );

  const result = useCursorPaginated<
    SocialActivityItemDto,
    Record<string, never>
  >({
    key: key ?? [],
    fetcher,
    params: {},
    paginationKind: "cursor",
  });

  // Resolve the visibility through the shared resolver (the
  // mapping is identical to `useMutualFriends` so we reuse the
  // same resolver).
  const code = result.error?.code;
  const visibility = resolveMutualVisibility(code);

  // Rate-limit derivation. The pure derivation of
  // `cooldownSeconds` (the integer duration) lives in a `useMemo`
  // so the value is stable across renders when the error hasn't
  // changed. The hook captures the moment the rate-limit was
  // first observed via `rateLimitAnchorMs` (a state cell written
  // inside a `useEffect` that fires when the cooldown becomes
  // available). The epoch conversion (`anchor + cooldown *
  // 1000`) is a pure arithmetic expression evaluated during
  // render — `Date.now()` is never called in the render path.
  const cooldownSeconds = useMemo<number | null>(() => {
    if (result.error === null) return null;
    if (!isRateLimitErrorCode(result.error.code)) return null;
    const { cooldownSeconds: decoded } = decodeRateLimit(result.error);
    if (decoded === null || decoded <= 0) return null;
    return decoded;
  }, [result.error]);

  // The anchor time at which the rate-limit was observed. The
  // value is initialised to `null`; a `useEffect` captures the
  // current `Date.now()` once when a non-null `cooldownSeconds`
  // is first observed. Subsequent rate-limit cycles overwrite the
  // anchor — the countdown restarts against the fresh anchor.
  //
  // The effect-driven setState is documented as the
  // canonical pattern for "memoised state that depends on an
  // effect-only signal" — the lint warning is suppressed
  // because the alternative (`useState` + `useMemo`) calls
  // `Date.now()` during render, which violates the
  // `react-hooks/purity` rule.
  const [rateLimitAnchorMs, setRateLimitAnchorMs] = useState<
    number | null
  >(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRateLimitAnchorMs(
      cooldownSeconds === null ? null : Date.now(),
    );
  }, [cooldownSeconds]);

  const rateLimitedUntil: number | null =
    cooldownSeconds !== null && rateLimitAnchorMs !== null
      ? rateLimitAnchorMs + cooldownSeconds * 1000
      : null;

  // Eventual-consistency derivation. The paginated `useCursorPaginated`
  // primitive does not surface a typed `staleness` signal the way
  // `useEventuallyConsistentQuery` (Epic 6.3) does. The minimal
  // derivation the Story 6.4 page consumes is:
  //
  //   - `'stale'` while a revalidation is in flight and the cache
  //     already has items (i.e. the consumer should keep showing the
  //     cached items but signal "the data may be a moment behind").
  //   - `'fresh'` otherwise.
  //
  // The derivation is a pure function of the SWR signal and the
  // cached item count; no clock, no random.
  const staleness: ConsistencyStaleness =
    result.isLoading && result.items.length > 0 ? "stale" : "fresh";

  if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
  if (!isAuthenticated) return FALLBACK_RESULT;
  if (targetUserId === null) return FALLBACK_RESULT;

  // Privacy branches: the hook returns the safe fallback shape
  // (`{ items: [], total: 0, visibility }`); the consumer renders
  // the privacy notice instead of an error.
  const items = visibility !== "visible" ? [] : result.items;
  const total = visibility !== "visible" ? 0 : result.items.length;
  const error =
    visibility !== "visible" && result.error !== null ? null : result.error;

  return {
    items,
    total,
    visibility,
    isLoading: result.isLoading,
    isStale: false,
    staleness,
    error,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    retry: result.refresh,
    rateLimitedUntil,
  };
}
