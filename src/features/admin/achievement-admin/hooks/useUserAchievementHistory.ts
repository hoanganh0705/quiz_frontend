'use client';

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

const DEFAULT_LIMIT = 20;

const ADMIN_HISTORY_CACHE_KEY = 'admin-achievement-history' as const;

export interface UseUserAchievementHistoryResult {

readonly history: readonly AdminAchievementHistoryItemDto[];

readonly hasMore: boolean;

readonly isLoading: boolean;

readonly isLoadingMore: boolean;

readonly error: ApiError | null;

readonly rateLimitedUntil: string | null;

readonly mutate: () => void;

readonly loadMore: () => void;
}

type AdminHistoryWireResponse = {
data?: AdminAchievementHistoryItemDto[];
meta?: { pagination?: OffsetPaginationMetaDto };
};

export function useUserAchievementHistory(
userId: string | null,
): UseUserAchievementHistoryResult {
const flagValue = getFeatureFlagValue('admin_achievement_live');
const isFlagPlaceholder = flagValue === 'placeholder';

const isDisabled =
isFlagPlaceholder || userId === null || validateUserId(userId).ok === false;

const [page, setPage] = useState(0);

const [allItems, setAllItems] = useState<AdminAchievementHistoryItemDto[]>([]);

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

const history = useMemo<readonly AdminAchievementHistoryItemDto[]>(() => {
if (!data?.data) return [];
const incoming = data.data;
if (page === 0) return incoming;

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
rateLimitedUntil: null,
mutate,
loadMore,
  };
}
