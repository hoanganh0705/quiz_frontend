"use client";

/**
 * `SocialSearchPlaceholder` — Canonical "Coming soon" placeholder
 * for the social user-search route.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.B5.
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by the social user-search
 * route scaffold when `phase6_social_search === 'placeholder'`. The
 * component:
 *
 *   - Renders the search bar shell and "Coming soon" copy.
 *   - Matches the eventual layout of the live search page.
 *
 * The component is statically rendered. It calls no SWR / no hook, and
 * renders identical markup on server and client.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other browser-only
 * API. It is safe to import from Server Components and from the App
 * Router's route modules.
 */

import type { ReactElement } from "react";

export function SocialSearchPlaceholder(): ReactElement {
  return (
    <section
      data-testid="social-search-placeholder"
      aria-label="Social user search (placeholder)"
      className="flex flex-col gap-4 p-6"
    >
      {/* Search input shell */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <div className="flex-1">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Placeholder copy */}
      <div className="flex flex-col gap-2 text-center py-8">
        <p className="text-base font-semibold">Search coming soon</p>
        <p className="text-sm text-muted-foreground">
          Find people to follow and connect with.
        </p>
      </div>
    </section>
  );
}
