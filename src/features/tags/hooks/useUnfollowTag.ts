"use client";

import { useCallback } from "react";

import { type OptimisticToggleError, useOptimisticToggle } from "@/lib/api";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { unfollowTag } from "@/features/tags/services/tags.service";

export interface UseUnfollowTagResult {
  isPending: boolean;
  lastError: OptimisticToggleError | null;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

export function useUnfollowTag(id: string | null): UseUnfollowTagResult {
  const keysToInvalidate = id
    ? ([TAG_KEYS.followed(), TAG_KEYS.details()] as const)
    : [];

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: true,
    toggle: id ? () => unfollowTag(id) : () => Promise.resolve(),
    keysToInvalidate,
  });

  const unfollow = useCallback(async (): Promise<void> => {
    if (id === null) {
      return NOOP();
    }
    await toggle();
  }, [id, toggle]);

  return {
    isPending: status === "pending",
    lastError,
    follow: NOOP,
    unfollow,
  };
}
