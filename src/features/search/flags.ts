/**
 * Feature-flag surface for the Story 5.6 search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.E1.
 *
 * ## What this module owns
 *
 * A typed accessor and a boolean predicate for the `phase5_search`
 * feature flag. The flag is registered globally in
 * `src/lib/feature-flags/feature-flags.ts` (default `'placeholder'`).
 *
 * ## Why this exists
 *
 * TKT-5.6.E1 AC #3 forbids components and hooks from branching on
 * `getFeatureFlagValue("phase5_search") === "placeholder"` directly.
 * Routing every call site through `isSearchSurfaceEnabled()` makes
 * flag flips a single-file edit and keeps the intent ("is the search
 * surface alive?") semantic rather than value-comparative.
 *
 * ## Directionality
 *
 * This module is one-way: it consumes the project-wide flag registry
 * and exposes a typed predicate; it does not import from any other
 * module in `src/features/search/**`. That keeps the flag surface
 * cheap to import at the top of any hook or component.
 *
 * ## SSR-safety
 *
 * `getFeatureFlagValue` is SSR-safe (reads `process.env.NEXT_PUBLIC_*`
 * at module-init). Both exports remain synchronous and SSR-safe.
 */

import {
  getFeatureFlagValue,
  type FeatureFlagValueMap,
} from "@/lib/feature-flags";

/**
 * Feature-flag name for the search surface.
 *
 * Aliased as a constant so call sites never hardcode the string
 * literal — a typo would otherwise compile silently.
 */
export const PHASE5_SEARCH_FLAG = "phase5_search" as const satisfies keyof FeatureFlagValueMap;

/**
 * Return `true` when the search surface is enabled.
 *
 * `false` when:
 *
 *   - The flag is `'placeholder'` (the default — Phase 5 search
 *     surfaces off in production).
 *   - The flag's value is anything other than `'live'` (defensive —
 *     the typed value union is `'live' | 'placeholder'`; future
 *     additions to that union automatically flow through here).
 *
 * The predicate uses strict equality so a future `'enabled-but-
 * restricted'` value would still resolve to `false` until the
 * underlying enum and this predicate are updated together.
 */
export function isSearchSurfaceEnabled(): boolean {
  return getFeatureFlagValue(PHASE5_SEARCH_FLAG) === "live";
}
