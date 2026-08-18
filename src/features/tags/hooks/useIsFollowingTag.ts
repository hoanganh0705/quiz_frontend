'use client';

import { useFollowedLookup } from '@/features/tags/hooks/useFollowedLookup';

export interface UseIsFollowingTagResult {

isFollowing: boolean;

isLoading: boolean;
}

export function useIsFollowingTag(id: string | null): UseIsFollowingTagResult {
const lookup = useFollowedLookup();

if (id === null) {
return { isFollowing: false, isLoading: false };
  }

return {
isFollowing: lookup.tags.has(id),
isLoading: lookup.isLoading,
  };
}