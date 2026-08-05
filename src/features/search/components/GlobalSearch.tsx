"use client";

/**
 * `GlobalSearch.tsx` — header search entry integrating SearchInput with URL routing.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.D5 / TKT-5.6.E1 (centralized flag wiring).
 *
 * ## What this component owns
 *
 * - Mounts `SearchInput` in the application header layout.
 * - Routes submitted queries to `/search?q=...&kinds=...` via `useSearchUrlState`.
 * - Defers the feature-flag check to `SearchGuard` from the centralized
 *   `lib/guard.tsx` module so flag flips are a single-file edit.
 *
 * ## What this component does NOT own
 *
 * - The header layout itself (owned by `AppHeader` in `@/shared/layout`).
 * - Feature-flag logic (centralized in `SearchGuard`).
 *
 * ## No social write DTO invariant
 *
 * This component only handles plain text queries and URL routing.
 * No social write DTOs or the deprecated `/social/friend-request` constant
 * are imported.
 *
 * ## SSR
 *
 * This is a client component (uses `useSearchUrlState` which reads
 * `useSearchParams`). Components that wrap this must provide a `<Suspense>`
 * boundary.
 */

import * as React from "react";

import { SearchInput } from "./SearchInput";
import { useSearchUrlState } from "@/features/search/hooks/useSearchUrlState";
import { SearchGuard } from "@/features/search/lib/guard";

// ─── Component ───────────────────────────────────────────────────────────

/**
 * Header search entry point.
 *
 * Wraps the inner search in `SearchGuard` so the feature flag gates the
 * entire surface from a single, centralized location.
 */
export function GlobalSearch() {
  return (
    <SearchGuard fallback={null}>
      <GlobalSearchInner />
    </SearchGuard>
  );
}

/**
 * Inner component — only rendered when the feature flag is live.
 * This separation keeps the guard at the outer boundary.
 */
function GlobalSearchInner() {
  const { setQuery } = useSearchUrlState();

  const handleSubmit = React.useCallback(
    (q: string) => {
      // Write the query to the URL (debounced by useSearchUrlState).
      // The /search route consumes these params to drive useSearch.
      setQuery(q);
    },
    [setQuery],
  );

  return (
    <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0 max-w-sm sm:max-w-md lg:max-w-xl">
      <SearchInput
        onSubmit={handleSubmit}
        placeholder="Search quizzes, users, tournaments…"
        className="w-full"
      />
    </div>
  );
}
