"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";

import { isAchievementSurfaceEnabled } from "@/features/achievements/flags";
import { makeAchievementInvalidationKeys } from "@/features/achievements/types";

export function useAchievementFocusRevalidation(): void {
const isLive = isAchievementSurfaceEnabled();
const { mutate } = useSWRConfig();

useEffect(() => {

if (!isLive) {
return;
    }

const handleFocus = () => {
const keys = makeAchievementInvalidationKeys();

void mutate(keys.catalog, undefined, { revalidate: true });
void mutate(keys.myBadges, undefined, { revalidate: true });
void mutate(keys.history, undefined, { revalidate: true });
    };

window.addEventListener("focus", handleFocus);
return () => {
window.removeEventListener("focus", handleFocus);
    };
  }, [isLive, mutate]);
}
