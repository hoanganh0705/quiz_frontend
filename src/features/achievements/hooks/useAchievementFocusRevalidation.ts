"use client";

/**
 * `useAchievementFocusRevalidation` — focus-driven revalidation bridge.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F2.
 *
 * ## What this hook owns
 *
 * - Subscribe to the `window` `focus` event.
 * - On focus, call SWR's global `mutate` against the achievement
 *   invalidation key set from
 *   `makeAchievementInvalidationKeys()` — catalog, my-badges,
 *   history — so freshly earned badges appear without manual refresh
 *   when the user returns to the page.
 * - This is the **fallback** signal for F2 AC #5. The primary
 *   signal is the notification-driven bridge
 *   (`useAchievementNotificationRevalidation`, TKT-5.5.C2); focus
 *   revalidation exists so environments where the notification socket
 *   is unavailable still keep the page fresh.
 *
 * ## Feature flag
 *
 * When `achievements_live === 'placeholder'`, the hook is a no-op.
 * Focus events are still observed (so we don't accidentally establish
 *   a listener we have to tear down), but no SWR mutation is fired.
 *
 * ## SSR-safety
 *
 * The hook only attaches a focus listener inside a `useEffect` so it
 * runs in the browser only. The SSR pass leaves no global side
 * effects.
 *
 * ## Why global `mutate` instead of hook-local refresh
 *
 * The achievement surfaces live in four separate SWR caches
 * (`useBadges`, `useMyBadges`, `useAchievementHistory`, `useBadge`),
 * each populated by an independent subscriber. Calling each hook's
 * refresh would require this hook to know about every consumer. The
 * global `mutate(swrKey, undefined, { revalidate: true })` invokes
 * SWR's cross-tab revalidation contract for the canonical key set,
 * which is the documented Epic 5.1 way to refresh owned caches that
 * this hook does not own directly.
 *
 * ## Coexistence with the notification bridge
 *
 * Mounting both this hook and `useAchievementNotificationRevalidation`
 * in the same component tree is safe. The two bridges target the same
 * SWR key set, and SWR's `mutate` is idempotent — a duplicate
 * revalidation is harmless and deduped within SWR's dedupe window.
 */

import { useEffect } from "react";
import { useSWRConfig } from "swr";

import { isAchievementSurfaceEnabled } from "@/features/achievements/flags";
import { makeAchievementInvalidationKeys } from "@/features/achievements/types";

/**
 * Mount the focus-driven achievement revalidation bridge.
 *
 * No return value. Lifetime is bound to the component that calls it
 * (typically `AchievementsPage`).
 */
export function useAchievementFocusRevalidation(): void {
  const isLive = isAchievementSurfaceEnabled();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    // The bridge is a no-op when the surface is off; the early-return
    // here also means we never attach a window listener we don't
    // need to tear down.
    if (!isLive) {
      return;
    }

    const handleFocus = () => {
      const keys = makeAchievementInvalidationKeys();
      // Use `undefined` as the new data with `revalidate: true` —
      // SWR keeps the cached data visible and triggers an in-flight
      // refetch. This is the Epic 5.1 documented "refresh in the
      // background" pattern.
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
