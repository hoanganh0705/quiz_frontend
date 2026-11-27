"use client";

import { useCallback } from "react";

import { type OptimisticToggleError, useOptimisticToggle } from "@/lib/api";

import { CATEGORY_KEYS } from "@/features/categories/query-keys";
import { followCategory } from "@/features/categories/services/categories.service";

export interface UseFollowCategoryResult {
  isPending: boolean;

  lastError: OptimisticToggleError | null;

  follow: () => Promise<void>;

  unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

export function useFollowCategory(id: string | null): UseFollowCategoryResult {
  const keysToInvalidate = id
    ? ([CATEGORY_KEYS.followed(), CATEGORY_KEYS.details()] as const)
    : [];

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: false,
    toggle: id ? () => followCategory(id) : () => Promise.resolve(),
    keysToInvalidate,
  });

  const follow = useCallback(async (): Promise<void> => {
    if (id === null) {
      return NOOP();
    }
    await toggle();
  }, [id, toggle]);

  return {
    isPending: status === "pending",
    lastError,
    follow,
    unfollow: NOOP,
  };
}
