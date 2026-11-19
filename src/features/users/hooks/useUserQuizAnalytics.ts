"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  getUserQuizAnalytics,
  type CreatorQuizAnalytics,
} from "@/features/users/services/users.profile.service";
import { useUser } from "@/features/users/store/user-store";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

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

  const enabled = Boolean(isAuthenticated && isSelf && userId);

  const query = useQuery<CreatorQuizAnalytics | null>(
    {
      queryKey:
        enabled && userId
          ? (["users", userId, "quiz-analytics"] as const)
          : ["users", "quiz-analytics", "disabled"],
      queryFn: () => getUserQuizAnalytics(userId as string),
      enabled,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
    getQueryClient(),
  );

  if (!isAuthenticated) return EMPTY;
  if (userId === null) return EMPTY;
  if (!isSelf) return { ...EMPTY, isSelf: false };

  return {
    analytics: query.data ?? null,
    isLoading: query.isLoading && !query.error,
    isStale: Boolean(query.isFetching && query.data),
    error: (query.error as Error) ?? null,
    isSelf: true,
  };
}
