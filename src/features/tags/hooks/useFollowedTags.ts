"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, coerceToApiError } from "@/lib/api";

import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { TAG_KEYS } from "@/features/tags/query-keys";
import { followedTags } from "@/features/tags/services/tags.service";

export const FOLLOWED_TAGS_LIMIT = 100;

export interface UseFollowedTagsResult {
  tags: ReadonlySet<string>;
  isLoading: boolean;
  error: ApiError | null;
  mutate: () => Promise<void>;
}

function extractTagIds(
  page: Awaited<ReturnType<typeof followedTags>> | undefined,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const item of page?.data ?? []) {
    if (item.tagId) {
      ids.add(item.tagId);
    }
  }
  return ids;
}

export function useFollowedTags(): UseFollowedTagsResult {
  const { isAuthenticated } = useAuthState();

  const query = useQuery(
    {
      queryKey: isAuthenticated
        ? TAG_KEYS.followed(FOLLOWED_TAGS_LIMIT)
        : ["follow-lookup", "tags", "disabled"],
      queryFn: () => followedTags({ limit: FOLLOWED_TAGS_LIMIT }),
      enabled: Boolean(isAuthenticated),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  return {
    tags: extractTagIds(query.data),
    isLoading: query.isLoading,
    error: query.error ? coerceToApiError(query.error) : null,
    mutate: async () => {
      if (!isAuthenticated) return;
      await query.refetch();
    },
  };
}
