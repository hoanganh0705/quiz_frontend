"use client";

/**
 * `useInstancesPlayFeatureFlag` — hook to check `multiplayer_play_live` flag.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.F1.
 *
 * ## Usage
 *
 * ```
 * const { isPlaceholder } = useInstancesPlayFeatureFlag();
 * if (isPlaceholder) {
 *   return <GameplayPlaceholder />;
 * }
 * // render live gameplay surface
 * ```
 *
 * ## Contract
 *
 * Mirrors `useInstancesFeatureFlag` (Epic 5.7 TKT-5.7.E1),
 * `useTournamentFeatureFlag` (Epic 5.2 TKT-5.2.F1), and
 * `useNotificationFeatureFlag` (Epic 5.4 TKT-5.4.E1). The hook is
 * the single switch consulted by gameplay hooks, components, and the
 * route file. When the flag is `'placeholder'`, every gameplay hook
 * already short-circuits to a safe fallback internally; this hook
 * exists so the page composition layer can decide whether to render
 * the live game or a static placeholder surface.
 *
 * Independent of `multiplayer_instances_live` — disabling play does not affect
 * the lobby.
 */

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseInstancesPlayFeatureFlagResult {
  /** True when the feature flag is set to `'placeholder'`. */
  isPlaceholder: boolean;
  /** True when the feature flag is set to `'live'`. */
  isLive: boolean;
  /** The raw flag value. */
  flagValue: "live" | "placeholder";
}

/**
 * Check the `multiplayer_play_live` feature flag.
 *
 * Used by the instance game page composition (TKT-5.8.G1) and the
 * Next.js route mount (TKT-5.8.G2) to conditionally render the live
 * gameplay surface or the safe placeholder fallback.
 */
export function useInstancesPlayFeatureFlag(): UseInstancesPlayFeatureFlagResult {
  const flagValue = getFeatureFlagValue("multiplayer_play_live");
  const isPlaceholder = flagValue === "placeholder";
  const isLive = flagValue === "live";

  return {
    isPlaceholder,
    isLive,
    flagValue,
  };
}
