/**
 * Feature-flag surface for the Story 5.5 achievement surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.E1.
 *
 * ## What this module owns
 *
 * A typed accessor and a boolean predicate for the `achievements_live`
 * feature flag. The flag is registered globally in
 * `src/lib/feature-flags/feature-flags.ts` (default `'placeholder'`).
 *
 * ## Why this exists
 *
 * TKT-5.5.E1 AC #4 forbids components and hooks from branching on
 * `getFeatureFlagValue("achievements_live") === "placeholder"`
 * directly. Routing every call site through
 * `isAchievementSurfaceEnabled()` makes flag flips a single-file edit
 * and keeps the intent ("is the achievement surface alive?")
 * semantic rather than value-comparative.
 *
 * ## Directionality
 *
 * This module is one-way: it consumes the project-wide flag registry
 * and exposes a typed predicate; it does not import from any other
 * module in `src/features/achievements/**`. That keeps the flag
 * surface cheap to import at the top of any hook or component.
 *
 * ## SSR-safety
 *
 * `getFeatureFlagValue` is SSR-safe (reads `process.env.NEXT_PUBLIC_*`
 * at module-init). Both exports remain synchronous and SSR-safe.
 *
 * ## Adding a new flag surface
 *
 * If a sibling epic introduces a new achievement lane (e.g.
 * `achievements_live_streaks`), add a sibling `PHASE5_*_FLAG`
 * constant here and a `isAchievementXxxEnabled()` predicate. Keep the
 * convention:
 *
 *   - The raw constant is the *flag name* (string literal of the
 *     `FeatureFlag` union).
 *   - The predicate returns `true` when the flag is `'live'`.
 *   - The default (`'placeholder'`) yields `false`.
 */

import {
  getFeatureFlagValue,
  type FeatureFlagValueMap,
} from "@/lib/feature-flags";

/**
 * Feature-flag name for the achievement surface.
 *
 * Aliased as a constant so call sites never hardcode the string
 * literal — a typo would otherwise compile silently.
 */
export const PHASE5_ACHIEVEMENTS_FLAG = "achievements_live" as const satisfies keyof FeatureFlagValueMap;

/**
 * Return `true` when the achievement surface is enabled.
 *
 * `false` when:
 *
 *   - The flag is `'placeholder'` (the default — Phase 5 achievement
 *     surfaces off in production).
 *   - The flag's value is anything other than `'live'` (defensive —
 *     the typed value union is `'live' | 'placeholder'`; future
 *     additions to that union automatically flow through here).
 *
 * The predicate uses strict equality so a future `'enabled-but-
 * restricted'` value would still resolve to `false` until the
 * underlying enum and this predicate are updated together.
 */
export function isAchievementSurfaceEnabled(): boolean {
  return getFeatureFlagValue(PHASE5_ACHIEVEMENTS_FLAG) === "live";
}
