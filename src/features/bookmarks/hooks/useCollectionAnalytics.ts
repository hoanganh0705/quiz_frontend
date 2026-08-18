

'use client';

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { getCollectionAnalyticsData } from '@/features/bookmarks/api';
import type { CollectionAnalytics } from '@/features/bookmarks/types';
import { collectionAnalyticsKey } from '@/features/bookmarks/types';

export interface UseCollectionAnalyticsResult {

analytics: CollectionAnalytics | null;

isLoading: boolean;

error: ApiError | null;

isEmpty: boolean;

mutate: () => Promise<unknown>;
}

export function useCollectionAnalytics(
collectionId: string | null | undefined,
): UseCollectionAnalyticsResult {
const { isAuthenticated } = useAuthState();

const swrKey = collectionId && isAuthenticated
? collectionAnalyticsKey(collectionId)
: null;

const swr = useSWR(swrKey, () => getCollectionAnalyticsData(collectionId!), {

revalidateOnFocus: true,
dedupingInterval: 60000, // 1 minute deduping
  });

const analytics: CollectionAnalytics | null = swr.data ?? null;

const isEmpty = analytics !== null && analytics.totalQuizzes === 0;

const error: ApiError | null = (() => {
const first = swr.error;
if (!first) return null;
if (isApiError(first)) return first;
if (first && typeof first === 'object' && 'status' in first) {
return first as unknown as ApiError;
    }
return {
status: 0,
message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

return {
analytics,
isLoading: swr.isLoading,
error,
isEmpty,
mutate: swr.mutate,
  };
}
