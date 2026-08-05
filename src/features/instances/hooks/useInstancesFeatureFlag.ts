"use client";

/**
 * `useInstancesFeatureFlag` — hook to check `phase5_instances` flag.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.E1.
 *
 * ## Usage
 *
 * ```
 * const { isPlaceholder } = useInstancesFeatureFlag();
 * if (isPlaceholder) {
 *   return <InstancePlaceholder />;
 * }
 * // render live instance lobby surface
 * ```
 *
 * ## Contract
 *
 * Mirrors `useTournamentFeatureFlag` (Epic 5.2 TKT-5.2.F1) and
 * `useNotificationFeatureFlag` (Epic 5.4 TKT-5.4.E1). The hook is
 * the single switch consulted by hooks, components, and the route
 * file. When the flag is `'placeholder'`, every instance hook
 * already short-circuits to a safe fallback internally; this hook
 * exists so the page composition layer can decide whether to render
 * the live lobby or a static placeholder surface.
 */

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseInstancesFeatureFlagResult {
  /** True when the feature flag is set to `'placeholder'`. */
  isPlaceholder: boolean;
  /** True when the feature flag is set to `'live'`. */
  isLive: boolean;
  /** The raw flag value. */
  flagValue: "live" | "placeholder";
}

/**
 * Check the `phase5_instances` feature flag.
 *
 * Used by the instance room page composition (TKT-5.7.F1) and the
 * Next.js route mount (TKT-5.7.F2) to conditionally render the live
 * lobby or the safe placeholder fallback.
 */
export function useInstancesFeatureFlag(): UseInstancesFeatureFlagResult {
  const flagValue = getFeatureFlagValue("phase5_instances");
  const isPlaceholder = flagValue === "placeholder";
  const isLive = flagValue === "live";

  return {
    isPlaceholder,
    isLive,
    flagValue,
  };
}