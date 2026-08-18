'use client';

import { useFollowedLookup } from '@/features/tags';

export interface UseIsFollowingCategoryResult {

isFollowing: boolean;

isLoading: boolean;
}

export function useIsFollowingCategory(
id: string | null,
): UseIsFollowingCategoryResult {
const lookup = useFollowedLookup();

if (id === null) {
return { isFollowing: false, isLoading: false };
  }

return {
isFollowing: lookup.categories.has(id),
isLoading: lookup.isLoading,
  };
}