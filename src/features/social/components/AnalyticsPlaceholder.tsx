/**
 * `AnalyticsPlaceholder` — Canonical "Coming soon" placeholder for
 * the three Story 6.3 analytics surfaces (My Analytics, Stats,
 * Leaderboard).
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C5 (placeholder primitive; consumed by B2
 *                and B3's route scaffolds).
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by every analytics
 * route when `phase6_social === 'placeholder'`. The component:
 *
 *   - Renders kind-specific copy for each analytics surface.
 *   - Is statically rendered. It calls no SWR / no service, and
 *     renders identical markup on server and client.
 *   - Mirrors the design vocabulary of `SocialListPlaceholder`
 *     (Epic 6.2 / TKT-6.2.C5) so the routes visually align.
 *
 * ## Why the placeholder is a separate component
 *
 * The analytics surfaces are structurally different from the four
 * list surfaces (they render a chart or a paginated table rather
 * than a single list). They cannot reuse `SocialListPlaceholder`
 * directly without contorting the `SocialListKind` union to include
 * the analytics kinds, which would weaken the type guarantee Epic
 * 6.2 established for the list surfaces.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API. It is safe to import from Server Components and
 * from the App Router's route modules.
 */

import type { ReactElement } from "react";

import type { AnalyticsKind } from "@/features/social/types/analytics";

interface AnalyticsPlaceholderProps {
  /** The analytics surface the placeholder represents. */
  kind: Exclude<AnalyticsKind, "hub">;
  /**
   * Optional target user id the surface is conceptually about. The
   * placeholder does not surface the id in copy; it is accepted so
   * the call-site is type-compatible with the eventual live page
   * component.
   */
  targetUserId?: string | null;
}

const COPY: Record<
  Exclude<AnalyticsKind, "hub">,
  { title: string; description: string }
> = {
  "my-analytics": {
    title: "My analytics",
    description:
      "See how you've been using the social features. Sign in to view your weekly, monthly, and all-time numbers.",
  },
  stats: {
    title: "Stats",
    description:
      "See this user's public social stats. Sign in to view the full chart.",
  },
  leaderboard: {
    title: "Friend leaderboard",
    description:
      "See how your friends rank by XP this week. Sign in to view the full leaderboard.",
  },
};

/**
 * Canonical placeholder component. Server-renderable.
 */
export function AnalyticsPlaceholder({
  kind,
}: AnalyticsPlaceholderProps): ReactElement {
  const copy = COPY[kind];
  return (
    <section
      data-testid={`analytics-placeholder-${kind}`}
      aria-label={`${copy.title} (placeholder)`}
      className="flex flex-col gap-2 p-6"
    >
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.description}</p>
    </section>
  );
}
