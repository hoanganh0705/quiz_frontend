"use client";

import { useFollowedTags } from "@/features/tags/hooks/useFollowedTags";

export interface UseIsFollowingTagResult {
  isFollowing: boolean;

  isLoading: boolean;
}

export function useIsFollowingTag(id: string | null): UseIsFollowingTagResult {
  const lookup = useFollowedTags();

  if (id === null) {
    return { isFollowing: false, isLoading: false };
  }

  return {
    isFollowing: lookup.tags.has(id),
    isLoading: lookup.isLoading,
  };
}
