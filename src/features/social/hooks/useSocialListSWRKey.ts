/**
 * `useSocialListSWRKey` — SWR cache-key factory + shared config
 * defaults for the four list pages.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.D1.
 *
 * ## What this module owns
 *
 * The single SWR key shape every list page uses, plus the
 * `SOCIAL_LIST_SWR_DEFAULTS` object that callers spread into the
 * SWR config.
 *
 * ## SWR key shape
 *
 * The key is a frozen 4-tuple:
 *
 *   `['social', 'list', kind, targetUserId, cursor, limit]`
 *
 * The key is structurally identical for every list kind so the
 * cache namespace (`'social', 'list'`) is consistent. The cache
 * namespace is the lint-invariant target — any new code that
 * emits a key containing `'social'` outside this namespace is a
 * smell.
 *
 * ## Pagination field
 *
 * The list endpoints (see `quiz_backend/docs/generated/openapi.json`
 * → `GET /api/v1/social/users/{userId}/followers`,
 * `GET /api/v1/social/users/{userId}/following`,
 * `GET /api/v1/social/friends/{userId}`,
 * `GET /api/v1/social/blocked`) all paginate with `cursor` +
 * `limit`. The Epic 6.2 planning document originally specified
 * `offset`, but the OpenAPI is the source of truth — using
 * `offset` here would cache invalid keys that never match a real
 * request. The `useSocialListUrlState` hook (TKT-6.2.B3) reads
 * `cursor` from the URL for the same reason. **Any future planner
 * working in this area should treat `cursor` as authoritative.**
 *
 * ## Internal-id invariant
 *
 * The key MUST NEVER contain `followId`, `friendshipId`, or
 * `blockId`. The cross-batch invariant enforces this; the test in
 * `__tests__/useSocialListSWRKey.spec.ts` asserts the invariant
 * explicitly.
 */

import type { SocialListKind } from "../components/SocialListKind";
import {
  SOCIAL_GRAPH_DEFAULT_LIMIT,
  SOCIAL_GRAPH_MAX_LIMIT,
} from "../pagination-invariants";

/**
 * The shape of an SWR cache key for a list page.
 *
 * Frozen tuple — callers must NOT mutate the key. SWR keys are
 * compared by reference identity, so mutation would break
 * deduplication.
 */
export type SocialListSWRKey = readonly [
  "social",
  "list",
  SocialListKind,
  string,
  string | null,
  number,
];

/**
 * SWR config defaults shared by every list page.
 *
 * The values are conservative: dedupe aggressively (we don't want
 * three tabs fetching the same page twice), revalidate on focus
 * (counts go stale quickly as the user opens / closes tabs),
 * revalidate on reconnect (online / offline transitions matter
 * for mobile), and `keepPreviousData` (avoid flashing the skeleton
 * on a pagination boundary).
 */
export const SOCIAL_LIST_SWR_DEFAULTS = Object.freeze({
  dedupeInterval: 5_000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateOnVisibility: true,
  keepPreviousData: true,
});

/**
 * Build the SWR cache key for a list page.
 *
 * @param kind — The list kind (`'followers' | 'following' | 'friends' | 'blocked'`).
 * @param targetUserId — The user the list is conceptually about.
 * @param cursor — The pagination cursor, or `null` for the first page.
 * @param limit — The page size, clamped to `[1, SOCIAL_GRAPH_MAX_LIMIT]`.
 *
 * @returns The frozen tuple key, or `null` when any required input
 *   is missing.
 */
export function makeSocialListSWRKey(
  kind: SocialListKind,
  targetUserId: string,
  cursor: string | null,
  limit: number,
): SocialListSWRKey | null {
  if (typeof targetUserId !== "string" || targetUserId.length === 0) {
    return null;
  }
  if (cursor !== null && typeof cursor !== "string") {
    return null;
  }
  const clampedLimit = clampLimit(limit);
  return Object.freeze([
    "social",
    "list",
    kind,
    targetUserId,
    cursor,
    clampedLimit,
  ] as const);
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) return SOCIAL_GRAPH_DEFAULT_LIMIT;
  if (limit > SOCIAL_GRAPH_MAX_LIMIT) return SOCIAL_GRAPH_MAX_LIMIT;
  return Math.floor(limit);
}

/**
 * Hook form of the key factory. The hook signature mirrors the
 * eventual list-page consumer; the implementation is a thin
 * wrapper over `makeSocialListSWRKey` so test mocks can replace
 * either the hook or the function directly.
 */
export function useSocialListSWRKey(
  kind: SocialListKind,
  targetUserId: string | null,
  cursor: string | null,
  limit: number,
): SocialListSWRKey | null {
  if (targetUserId === null) return null;
  return makeSocialListSWRKey(kind, targetUserId, cursor, limit);
}