"use client";

/**
 * `guard.tsx` — feature-flag guard for the search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.E1.
 *
 * ## What this module owns
 *
 * A single `SearchGuard` component that renders its children when
 * `search_live === 'live'` and `null` when it is `'placeholder'`.
 * This is the single gating surface consumed by `GlobalSearch` (TKT-5.6.D5)
 * and the `/search` route guard (TKT-5.6.F1).
 *
 * ## Why this exists
 *
 * Centralizing the flag check in one place means:
 *   - Flag flips are a single-file edit.
 *   - Call sites never branch on `getFeatureFlagValue` directly.
 *   - The intent ("is the search surface alive?") is semantic rather
 *     than value-comparative.
 *
 * ## SSR-safety
 *
 * `isSearchSurfaceEnabled()` reads `process.env.NEXT_PUBLIC_*` at
 * module-init, which is SSR-safe. The component never triggers a
 * dynamic render boundary.
 */

import * as React from "react";

import { isSearchSurfaceEnabled } from "@/features/search/flags";

export interface SearchGuardProps {
  /** Children rendered only when the search surface is live. */
  children: React.ReactNode;
  /**
   * Optional fallback rendered when `search_live === 'placeholder'`.
   * Defaults to `null` (the page or header shows nothing).
   */
  fallback?: React.ReactNode;
}

/**
 * Feature-flag guard for the search surface.
 *
 * Wraps a subtree that requires the search surface to be live. When
 * `search_live === 'placeholder'`, renders `fallback` (or `null`).
 *
 * @example
 *   // In the header:
 *   <SearchGuard>
 *     <GlobalSearch />
 *   </SearchGuard>
 *
 *   // In the /search page:
 *   <SearchGuard fallback={<SearchPlaceholder />}>
 *     <SearchPageContent />
 *   </SearchGuard>
 */
export function SearchGuard({ children, fallback = null }: SearchGuardProps) {
  if (!isSearchSurfaceEnabled()) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
