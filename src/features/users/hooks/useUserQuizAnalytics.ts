

'use client';

import useSWR from 'swr';

import { getUserQuizAnalytics, type CreatorQuizAnalytics } from '@/features/users/services/users.profile.service';
import { useUser } from '@/features/users/store/user-store';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

export interface UseUserQuizAnalyticsResult {
analytics: CreatorQuizAnalytics | null;
isLoading: boolean;
isStale: boolean;
error: Error | null;

isSelf: boolean;
}

const EMPTY: UseUserQuizAnalyticsResult = Object.freeze({
analytics: null,
isLoading: false,
isStale: false,
error: null,
isSelf: false,
});

export function useUserQuizAnalytics(
userId: string | null,
): UseUserQuizAnalyticsResult {
const auth = useAuthSession();
const viewerId = auth.currentUser?.userId ?? null;
const isAuthenticated = auth.isAuthenticated;
const userStore = useUser();
const viewerStoreId = userStore?.userId ?? null;

const isSelf =
userId !== null &&
((viewerId !== null && viewerId === userId) ||
(viewerStoreId !== null && viewerStoreId === userId));

const swr = useSWR<CreatorQuizAnalytics | null>(
isAuthenticated && isSelf && userId
? (['users', userId, 'quiz-analytics'] as const)
: null,
() => getUserQuizAnalytics(userId as string),
{
revalidateOnFocus: false,
dedupingInterval: 60_000,
    },
  );

if (!isAuthenticated) return EMPTY;
if (userId === null) return EMPTY;
if (!isSelf) return { ...EMPTY, isSelf: false };

return {
analytics: swr.data ?? null,
isLoading: swr.isLoading,
isStale: Boolean(swr.isValidating && swr.data),
error: swr.error ?? null,
isSelf: true,
  };
}
