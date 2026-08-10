/**
 * `SocialFeedPlaceholder` — Canonical "Coming soon" placeholder for
 * the global social feed route.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.G1.
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by the feed route
 * scaffold when `social_feed_live === 'placeholder'`. The
 * component:
 *
 *   - Renders the placeholder shell matching the eventual feed page
 *     layout (rows + "Coming soon" copy).
 *   - Is statically rendered. It calls no SWR / no hook, and renders
 *     identical markup on server and client.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API. It is safe to import from Server Components and
 * from the App Router's route modules.
 */

import type { ReactElement } from "react";

/**
 * Canonical placeholder for the global social feed route.
 * Server-renderable.
 */
export function SocialFeedPlaceholder(): ReactElement {
  return (
    <section
      data-testid="social-feed-placeholder"
      aria-label="Global feed (placeholder)"
      className="flex flex-col gap-2 p-6"
    >
      <h2 className="text-lg font-semibold">Global feed</h2>
      <p className="text-sm text-muted-foreground">
        See what&apos;s happening across the platform. Sign in to view
        the live feed.
      </p>
    </section>
  );
}
