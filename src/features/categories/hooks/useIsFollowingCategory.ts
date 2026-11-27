"use client";

import { useFollowedCategories } from "@/features/categories/hooks/useFollowedCategories";

export interface UseIsFollowingCategoryResult {
  isFollowing: boolean;

  isLoading: boolean;
}

export function useIsFollowingCategory(
  id: string | null,
): UseIsFollowingCategoryResult {
  const lookup = useFollowedCategories();

  if (id === null) {
    return { isFollowing: false, isLoading: false };
  }

  return {
    isFollowing: lookup.categories.has(id),
    isLoading: lookup.isLoading,
  };
}
