"use client";

import { useEffect } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { makeAchievementInvalidationKeys } from "@/features/achievements/types";

export function useAchievementFocusRevalidation(): void {
  const isLive = true;

  useEffect(() => {
    if (!isLive) {
      return;
    }

    const handleFocus = () => {
      const keys = makeAchievementInvalidationKeys();

      try {
        const queryClient = getQueryClient();
        void queryClient.invalidateQueries({ queryKey: keys.catalog });
        void queryClient.invalidateQueries({ queryKey: keys.myBadges });
        void queryClient.invalidateQueries({ queryKey: keys.history });
      } catch {
        // Fail-open
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isLive]);
}
