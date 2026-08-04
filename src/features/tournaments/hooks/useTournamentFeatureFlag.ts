"use client";

/**
 * `useTournamentFeatureFlag` — hook to check phase5_tournaments flag.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.F1.
 *
 * ## Usage
 *
 * ```
 * const { isPlaceholder } = useTournamentFeatureFlag();
 * if (isPlaceholder) {
 *   return <TournamentPlaceholder />;
 * }
 * // render live tournament surface
 * ```
 */

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseTournamentFeatureFlagResult {
  /** True when the feature flag is set to 'placeholder'. */
  isPlaceholder: boolean;
  /** The raw flag value. */
  flagValue: "live" | "placeholder";
}

/**
 * Check the `phase5_tournaments` feature flag.
 *
 * Used by page components to conditionally render the live tournament
 * surface or the safe placeholder fallback.
 */
export function useTournamentFeatureFlag(): UseTournamentFeatureFlagResult {
  const flagValue = getFeatureFlagValue("phase5_tournaments");
  const isPlaceholder = flagValue === "placeholder";

  return {
    isPlaceholder,
    flagValue,
  };
}
