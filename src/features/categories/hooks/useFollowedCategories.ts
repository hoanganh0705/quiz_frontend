"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, coerceToApiError } from "@/lib/api";

import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { CATEGORY_KEYS } from "@/features/categories/query-keys";
import { followedCategories } from "@/features/categories/services/categories.service";

export const FOLLOWED_CATEGORIES_LIMIT = 100;

export interface UseFollowedCategoriesResult {
  categories: ReadonlySet<string>;
  isLoading: boolean;
  error: ApiError | null;
  mutate: () => Promise<void>;
}

function extractCategoryIds(
  page: Awaited<ReturnType<typeof followedCategories>> | undefined,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const item of page?.data ?? []) {
    if (item.categoryId) {
      ids.add(item.categoryId);
    }
  }
  return ids;
}

export function useFollowedCategories(): UseFollowedCategoriesResult {
  const { isAuthenticated } = useAuthState();

  const query = useQuery(
    {
      queryKey: isAuthenticated
        ? CATEGORY_KEYS.followed(FOLLOWED_CATEGORIES_LIMIT)
        : ["follow-lookup", "categories", "disabled"],
      queryFn: () => followedCategories({ limit: FOLLOWED_CATEGORIES_LIMIT }),
      enabled: Boolean(isAuthenticated),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  return {
    categories: extractCategoryIds(query.data),
    isLoading: query.isLoading,
    error: query.error ? coerceToApiError(query.error) : null,
    mutate: async () => {
      if (!isAuthenticated) return;
      await query.refetch();
    },
  };
}
