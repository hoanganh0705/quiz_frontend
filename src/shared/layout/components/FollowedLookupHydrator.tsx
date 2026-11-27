"use client";

import { useFollowedCategories } from "@/features/categories/hooks/useFollowedCategories";
import { useFollowedTags } from "@/features/tags/hooks/useFollowedTags";

export function FollowedLookupHydrator(): null {
  useFollowedCategories();
  useFollowedTags();
  return null;
}
