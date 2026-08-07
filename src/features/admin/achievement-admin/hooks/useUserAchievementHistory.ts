'use client';

/**
 * `features/admin/achievement-admin/hooks/useUserAchievementHistory.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C2.
 *
 * ## What this hook owns
 *
 * - Fetch a user's achievement history through the admin service layer
 *   (`getUserAchievementHistory` — offset-paginated, per
 *   `GetUserAchievementHistory200`).
 * - Validate the `userId` before any fetch fires.
 * - Expose `{ history, hasMore, isLoading, isLoadingMore, error,
 *   rateLimitedUntil, mutate, loadMore }` for the admin history panel.
 * - Feature-flag gating via `phase7_admin_achievement`.
 *
 * ## Pagination
 *
 * History uses offset pagination (`OffsetPaginationMetaDto`).
 * Confirmed by A1 §2.5 and the Phase 5 `useAchievementHistory` hook
 * ("History uses offset pagination"). The SDK params are `offset?: number`
 * and `limit?: number`.
 *
 * The `loadMore()` function increments the page offset and appends results.
 * Duplicate entries by `userBadgeId` are removed before returning.
 *
 * ## Rate-limit handling
 *
 * The SDK does not expose rate-limit headers at this commit (A1 §2.5 verdict).
 * `rateLimitedUntil` is always `null`. When the backend exposes
 * `X-RateLimit-Remaining` / `Retry-After`, this hook is the single edit
 * point to surface `rateLimitedUntil`.
 *
 * ## Feature flag
 *
 * When `phase7_admin_achievement === 'placeholder'`, the hook returns
 * safe fallback. No service call fires.
 */

import { useCallback, useMemo, useState } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import {
  getUserAchievementHistory,
} from '@/features/achievements/services/achievements.service';
import {
  toAchievementHistoryPage,
  type AchievementHistoryPage,
  ACHIEVEMENT_CACHE_KEYS,
} from '@/features/achievements/types';

import type {
  AdminAchievementHistoryItemDto,
  GetUserAchievementHistory200,
  OffsetPaginationMetaDto,
} from '@/lib/api/generated/schemas';

import { validateUserId } from '../validation';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;

const ADMIN_HISTORY_CACHE_KEY = 'admin-achievement-history' as const;

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseUserAchievementHistoryResult {
  /** History entries for the user. */
  readonly history: readonly AdminAchievementHistoryItemDto[];
  /** True when more pages exist. */
  readonly hasMore: boolean;
  /** True while the first fetch is in flight. */
  readonly isLoading: boolean;
  /** True while loading a subsequent page. */
  readonly isLoadingMore: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /**
   * When the backend rate-limits, the ISO timestamp when the
   * rate-limit expires. Always `null` at this commit.
   */
  readonly rateLimitedUntil: string | null;
  /** Revalidate the history. */
  readonly mutate: () => void;
  /** Load the next page. No-op when `hasMore` is false or rate-limited. */
  readonly loadMore: () => void;
}

// ─── Wire envelope ────────────────────────────────────────────────────────

/**
 * Wire envelope for the admin history endpoint.
 *
 * Shape: `{ data?: AdminAchievementHistoryItemDto[],
 *           meta?: { pagination?: OffsetPaginationMetaDto } }`.
 *
 * Matches `GetUserAchievementHistory200`.
 */
type AdminHistoryWireResponse = {
  data?: AdminAchievementHistoryItemDto[];
  meta?: { pagination?: OffsetPaginationMetaDto };
};

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read a user's achievement history for the achievement admin surface.
 *
 * Returns safe fallback when the flag is off or the id is invalid.
 */
export function useUserAchievementHistory(
  userId: string | null,
): UseUserAchievementHistoryResult {
  const flagValue = getFeatureFlagValue('phase7_admin_achievement');
  const isFlagPlaceholder = flagValue === 'placeholder';

  const isDisabled =
    isFlagPlaceholder || userId === null || validateUserId(userId).ok === false;

  // Track current page (0-indexed offset index) for loadMore.
  const [page, setPage] = useState(0);
  // Accumulated items from all loaded pages.
  const [allItems, setAllItems] = useState<AdminAchievementHistoryItemDto[]>([]);
  // Whether we are loading a subsequent page.
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const key = useMemo(
    () =>
      isDisabled
        ? ([ADMIN_HISTORY_CACHE_KEY, 'disabled'] as const)
        : ([ADMIN_HISTORY_CACHE_KEY, userId, page] as const),
    [isDisabled, userId, page],
  );

  const fetcher = useCallback(
    async (): Promise<AdminHistoryWireResponse> => {
      if (isDisabled) {
        return { data: [], meta: { pagination: { kind: 'offset', page: 0, limit: DEFAULT_LIMIT, total: 0, hasMore: false } } };
      }
      const result = await getUserAchievementHistory(userId!, {
        offset: page * DEFAULT_LIMIT,
        limit: DEFAULT_LIMIT,
      });
      return result as unknown as AdminHistoryWireResponse;
    },
    [isDisabled, userId, page],
  );

  const { data, error, isLoading, mutate } = useSWR<
    AdminHistoryWireResponse,
    ApiError
  >(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // When a new page arrives, append deduplicated items.
  const history = useMemo<readonly AdminAchievementHistoryItemDto[]>(() => {
    if (!data?.data) return [];
    const incoming = data.data;
    if (page === 0) return incoming;
    // Append, dedupe by userBadgeId.
    const seen = new Set(allItems.map((i) => i.userBadgeId));
    const newItems = incoming.filter((i) => !seen.has(i.userBadgeId));
    return [...allItems, ...newItems];
  }, [data, page, allItems]);

  const hasMore = data?.meta?.pagination?.hasMore ?? false;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && !isLoadingMore) {
      setIsLoadingMore(true);
      setAllItems((prev) => (page === 0 ? (data?.data ?? []) : prev));
      setPage((p) => p + 1);
    }
  }, [hasMore, isLoading, isLoadingMore, page, data?.data]);

  return {
    history,
    hasMore,
    isLoading,
    isLoadingMore,
    error: error ?? null,
    rateLimitedUntil: null, // A1 §2.5: rate-limit headers not exposed at this commit
    mutate,
    loadMore,
  };
}
