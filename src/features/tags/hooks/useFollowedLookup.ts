"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { followedCategories } from "@/features/categories/services/categories.service";
import { followedTags } from "@/features/tags/services/tags.service";

export const FOLLOWED_LOOKUP_LIMIT = 100;

export const followedCategoriesKey = () =>
  ["follow-lookup", "categories", { limit: FOLLOWED_LOOKUP_LIMIT }] as const;

export const followedTagsKey = () =>
  ["follow-lookup", "tags", { limit: FOLLOWED_LOOKUP_LIMIT }] as const;

export interface UseFollowedLookupResult {
  categories: ReadonlySet<string>;
  tags: ReadonlySet<string>;
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

const NOOP = async (): Promise<void> => {
  return;
};

export function useFollowedLookup(): UseFollowedLookupResult {
  const { isAuthenticated } = useAuthState();

  const categoriesKey = isAuthenticated ? followedCategoriesKey() : null;
  const tagsKey = isAuthenticated ? followedTagsKey() : null;

  const categoriesFetcher = () =>
    followedCategories({ limit: FOLLOWED_LOOKUP_LIMIT });

  const tagsFetcher = () => followedTags({ limit: FOLLOWED_LOOKUP_LIMIT });

  const categoriesQuery = useQuery(
    {
      queryKey: categoriesKey ?? ["follow-lookup", "categories", "disabled"],
      queryFn: categoriesFetcher,
      enabled: Boolean(isAuthenticated),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  const tagsQuery = useQuery(
    {
      queryKey: tagsKey ?? ["follow-lookup", "tags", "disabled"],
      queryFn: tagsFetcher,
      enabled: Boolean(isAuthenticated),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  const categories = extractCategoryIds(categoriesQuery.data);
  const tags = extractTagIds(tagsQuery.data);

  const isLoading = categoriesQuery.isLoading || tagsQuery.isLoading;

  const error: ApiError | null = (() => {
    const first = categoriesQuery.error ?? tagsQuery.error;
    if (!first) return null;
    if (isApiError(first)) return first;

    if (first && typeof first === "object" && "status" in first) {
      return first as unknown as ApiError;
    }

    return {
      status: 0,
      message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

  const mutate = async (): Promise<void> => {
    if (!isAuthenticated) {
      return NOOP();
    }
    await Promise.all([categoriesQuery.refetch(), tagsQuery.refetch()]);
  };

  return {
    categories,
    tags,
    isLoading,
    error,
    mutate,
  };
}
