/**
 * `SocialHubPlaceholder` — Canonical "Coming soon" placeholder for
 * the Social Hub landing page (`/social`).
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C5 (placeholder primitive; consumed by B1's
 *                `/social` route scaffold).
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by the Social Hub
 * landing page when `phase6_social === 'placeholder'`. The
 * component:
 *
 *   - Renders the Social Hub landing copy (counts summary + entry
 *     tiles for My Analytics, Friend Leaderboard, and the viewer's
 *     own Stats card).
 *   - Is statically rendered. It calls no SWR / no service, and
 *     renders identical markup on server and client.
 *   - Mirrors the design vocabulary of `SocialListPlaceholder`
 *     (Epic 6.2 / TKT-6.2.C5) so the four routes visually align.
 *
 * ## Why the placeholder is a separate component
 *
 * The Social Hub is structurally different from the four list
 * surfaces (it aggregates a counts card with three entry tiles
 * rather than rendering a single list). It cannot reuse
 * `SocialListPlaceholder` directly without contorting the
 * `SocialListKind` union to include `'hub'`, which would weaken the
 * type guarantee Epic 6.2 established for the list surfaces.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API. It is safe to import from Server Components and
 * from the App Router's route modules.
 */

import type { ReactElement } from "react";

interface SocialHubPlaceholderProps {
  /** Optional viewer display name (purely cosmetic; the placeholder
   *  renders identically with or without it). */
  viewerDisplayName?: string | null;
}

/**
 * Canonical placeholder for the `/social` Social Hub landing page.
 * Server-renderable.
 */
export function SocialHubPlaceholder({
  viewerDisplayName,
}: SocialHubPlaceholderProps): ReactElement {
  const greeting = viewerDisplayName ? `Welcome back, ${viewerDisplayName}` : "Welcome back";
  return (
    <section
      data-testid="social-hub-placeholder"
      aria-label="Social Hub (placeholder)"
      className="flex flex-col gap-3 p-6"
    >
      <h2 className="text-lg font-semibold">{greeting}</h2>
      <p className="text-sm text-muted-foreground">
        Your social counts, my analytics, and the friend leaderboard
        will land here. Sign in to view the full hub.
      </p>
    </section>
  );
}
