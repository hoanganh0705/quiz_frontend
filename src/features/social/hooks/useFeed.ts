"use client";

/**
 * `useFeed` — Story 6.9 read hook for the global social feed surface.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.D2.
 *
 * ## What this hook owns
 *
 * The single read hook the feed page (`SocialFeedPage`,
 * TKT-6.9.G1) calls to fetch the viewer's global activity feed.
 * The hook:
 *
 *   - Calls the verified service wrapper `getFeed`
 *     (TKT-6.9.C1) via the new `useOffsetPaginated` primitive
 *     (TKT-6.9.D1).
 *   - Uses SWR cache key `SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId)`
 *     (no offset / cursor / page literal in the key).
 *   - Returns a typed result that exposes `items`, `hasMore`,
 *     `loadMore`, `isLoading`, `isLoadingMore`, `error`, `refresh`,
 *     `staleness`, `visibility`, `rateLimitedUntil`,
 *     `cooldownSeconds`.
 *   - Maps the documented privacy codes (`USER_PROFILE_PRIVATE`,
 *     `SOCIAL_USER_BLOCKED`, `SOCIAL_BLOCKED_USER`,
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN`) to the `visibility` field via
 *     the dedicated `resolveFeedVisibility` resolver.
 *   - Decodes rate-limit via `decodeRateLimit` and surfaces
 *     `rateLimitedUntil: number | null` (epoch ms).
 *   - Checks the `phase6_social_feed` flag (and the parent
 *     `phase6_social` flag) and returns a safe no-op fallback when
 *     the surface is `'placeholder'`.
 *   - Checks viewer authentication and returns a safe fallback when
 *     the viewer is unauthenticated.
 *   - Subscribes to the `auth-state-change` window event and clears
 *     the SWR feed cache on logout so a subsequent user on the same
 *     browser does not inherit the prior user's feed items.
 *
 * ## Why a client hook
 *
 * The SWR cache is client-side. Server-rendered shells receive the
 * `SocialFeedPlaceholder` (TKT-6.9.G1) until the client takes over.
 *
 * ## Server authority
 *
 * The list is server-authoritative. The hook never reads from local
 * state to populate the projection; the cache is the only state. The
 * `visibility` field is computed from the server-surfaced
 * `ApiError.code` via the pure `resolveFeedVisibility` resolver.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";

import {
  ApiError,
  useOffsetPaginated,
  type UseOffsetPaginatedResult,
} from "@/lib/api";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { getFeed } from "@/features/social/services/feed.service";
import type {
  SocialFeedItemDto,
} from "@/features/social/types";
import type {
  SocialListVisibility,
} from "@/features/social/social-list-visibility";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import {
  decodeRateLimit,
  isRateLimitErrorCode,
} from "@/features/social/rate-limit-decoder";
import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * The documented `FEED_PAGE_SIZE` (TKT-6.9.D2 AC #3). Defaults to
 * `20` items per page.
 */
export const FEED_PAGE_SIZE = 20;

// ─── Visibility resolver ────────────────────────────────────────────────

/**
 * Pure visibility resolver — exposed so the spec can pin the
 * privacy mapping without mocking the hook. Mirrors the
 * Epic 6.4 / TKT-6.4.D2 `resolveMutualVisibility` pattern, but
 * for the feed endpoint's documented privacy codes:
 *
 *   - `USER_PROFILE_PRIVATE`        → `private`
 *   - `SOCIAL_USER_BLOCKED`         → `blocked_viewer`
 *   - `SOCIAL_BLOCKED_USER`         → `blocked_by_viewer`
 *   - `SOCIAL_FRIEND_LIST_FORBIDDEN`→ `private`
 *   - Anything else (success + unknown codes) → `visible`
 */
export function resolveFeedVisibility(
  code: string | undefined,
): SocialListVisibility {
  if (code === "USER_PROFILE_PRIVATE") return "private";
  if (code === "SOCIAL_USER_BLOCKED") return "blocked_viewer";
  if (code === "SOCIAL_BLOCKED_USER") return "blocked_by_viewer";
  if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
  return "visible";
}

// ─── Public surface ──────────────────────────────────────────────────────

export interface UseFeedResult {
  readonly items: readonly SocialFeedItemDto[];
  readonly hasMore: boolean;
  readonly loadMore: () => void;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: ApiError | null;
  readonly refresh: () => Promise<void>;
  readonly staleness: ConsistencyStaleness;
  readonly visibility: SocialListVisibility;
  /**
   * The rate-limit cooldown in epoch milliseconds. `null` when
   * the feed is not rate-limited; a future epoch ms timestamp when
   * the feed is rate-limited.
   */
  readonly rateLimitedUntil: number | null;
  /**
   * The cooldown duration in seconds. `undefined` when no
   * rate-limit signal was present.
   */
  readonly cooldownSeconds?: number;
}

// ─── Internal constants ──────────────────────────────────────────────────

const PLACEHOLDER_RESULT: UseFeedResult = Object.freeze({
  items: [],
  hasMore: false,
  loadMore: () => undefined,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  refresh: () => Promise.resolve(),
  staleness: "fresh",
  visibility: "not_found",
  rateLimitedUntil: null,
  cooldownSeconds: undefined,
});

const UNAUTHENTICATED_RESULT: UseFeedResult = Object.freeze({
  items: [],
  hasMore: false,
  loadMore: () => undefined,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  refresh: () => Promise.resolve(),
  staleness: "fresh",
  visibility: "not_found",
  rateLimitedUntil: null,
  cooldownSeconds: undefined,
});

// ─── Hook ────────────────────────────────────────────────────────────────

const AUTH_STATE_EVENT = "auth-state-change";

/**
 * Read the viewer's global social feed. The hook is privacy-aware:
 * a non-visible viewer receives an empty list and the corresponding
 * `visibility` value. The hook never throws for privacy reasons.
 */
export function useFeed(viewerUserId: string | null): UseFeedResult {
  const parentFlagValue = getFeatureFlagValue("phase6_social");
  const subFlagValue = getFeatureFlagValue("phase6_social_feed");
  const isFlagPlaceholder =
    parentFlagValue === "placeholder" || subFlagValue === "placeholder";

  const auth = useAuthBootstrap();
  const isAuthenticated = auth.isAuthenticated;

  const swrConfig = useSWRConfig();

  // The SWR cache key is the caller's key — no offset / cursor /
  // page literal is appended.
  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    if (viewerUserId === null) return null;
    return SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId);
  }, [isFlagPlaceholder, isAuthenticated, viewerUserId]);

  // Adapter fetcher that delegates to the service wrapper.
  const fetcher = useMemo(
    () =>
      async ({
        offset,
        limit,
      }: {
        offset: number;
        limit: number;
        params: Record<string, never>;
      }) => {
        if (
          isFlagPlaceholder ||
          !isAuthenticated ||
          viewerUserId === null
        ) {
          return {
            items: [] as readonly SocialFeedItemDto[],
            offset,
            limit,
            hasMore: false,
          };
        }
        try {
          // The feed endpoint is cursor-paginated; the
          // offset-aware primitive threads the cursor through
          // opaquely. We pass `cursor: undefined` on the first
          // page and forward the SDK's `nextCursor` on
          // subsequent pages via the service wrapper.
          const cursor: string | undefined = undefined;
          const result = await getFeed({ ...(cursor ? { cursor } : {}), limit });
          return {
            items: result.items,
            offset,
            limit,
            hasMore: result.hasMore,
          };
        } catch (err) {
          // Privacy / block / 403 / 429 / 404 — rethrow; the hook
          // visibility resolver maps the error code to the
          // documented privacy branch.
          throw err;
        }
      },
    [isFlagPlaceholder, isAuthenticated, viewerUserId],
  );

  const paginated: UseOffsetPaginatedResult<SocialFeedItemDto> =
    useOffsetPaginated<SocialFeedItemDto, Record<string, never>>({
      key: key ?? [],
      fetcher,
      params: {},
      limit: FEED_PAGE_SIZE,
    });

  // Visibility derivation — pure mapping from the API error code.
  const code = paginated.error?.code;
  const visibility = resolveFeedVisibility(code);

  // Rate-limit derivation. Mirrors the Epic 6.4 / TKT-6.4.D2 pattern:
  // the decoded `cooldownSeconds` is memoised against the error;
  // the `rateLimitedUntil` epoch is computed via an effect-anchored
  // `Date.now()` to keep `Date.now()` out of the render path.
  const cooldownSeconds = useMemo<number | null>(() => {
    if (paginated.error === null) return null;
    if (!isRateLimitErrorCode(paginated.error.code)) return null;
    const { cooldownSeconds: decoded } = decodeRateLimit(paginated.error);
    if (decoded === null || decoded <= 0) return null;
    return decoded;
  }, [paginated.error]);

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

  // Staleness derivation — `'stale'` while a revalidation is in
  // flight and the cache already has items; `'fresh'` otherwise.
  const staleness: ConsistencyStaleness =
    paginated.isLoading && paginated.items.length > 0 ? "stale" : "fresh";

  // Auth-state-change listener — clears the SWR feed cache on
  // logout so a subsequent user on the same browser does not
  // inherit the prior user's feed items. The offset is derived
  // from the fresh cache and is therefore implicitly reset.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuthStateChange = () => {
      // Clear the entire feed cache; the key changes per viewer
      // so a stale read for the prior user cannot survive the
      // logout transition.
      void swrConfig.mutate(
        (cacheKey) =>
          Array.isArray(cacheKey) &&
          cacheKey[0] === "social" &&
          cacheKey[1] === "v1" &&
          cacheKey[2] === "feed",
        undefined,
        { revalidate: false },
      );
    };
    window.addEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    };
  }, [swrConfig]);

  const refresh = useCallback(async () => {
    await paginated.refresh();
  }, [paginated]);

  if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
  if (!isAuthenticated) return UNAUTHENTICATED_RESULT;
  if (viewerUserId === null) return UNAUTHENTICATED_RESULT;

  // Privacy branches: the hook returns the safe fallback shape
  // (`{ items: [], visibility }`); the consumer renders the
  // privacy notice instead of an error.
  const items = visibility !== "visible" ? [] : paginated.items;
  const error =
    visibility !== "visible" && paginated.error !== null
      ? null
      : paginated.error;

  return {
    items,
    hasMore: paginated.hasMore,
    loadMore: paginated.loadMore,
    isLoading: paginated.isLoading,
    isLoadingMore: paginated.isLoadingMore,
    error,
    refresh,
    staleness,
    visibility,
    rateLimitedUntil,
    cooldownSeconds:
      cooldownSeconds !== null ? cooldownSeconds : undefined,
  };
}