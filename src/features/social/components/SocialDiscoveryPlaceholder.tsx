"use client";

/**
 * `SocialDiscoveryPlaceholder` — Canonical "Coming soon" placeholder
 * for the social discovery routes (suggestions and trending).
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.B5.
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by the discovery route
 * scaffolds when `phase6_social_discovery === 'placeholder'`. The
 * component:
 *
 *   - Renders the surface-specific title and description copy.
 *   - Accepts a `surface: 'suggestions' | 'trending'` prop so the
 *     route scaffold renders the appropriate shell.
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

interface SocialDiscoveryPlaceholderProps {
  /**
   * The discovery surface the placeholder represents.
   *
   *   - `suggestions` — the social suggestions panel.
   *   - `trending`    — the trending users list.
   */
  surface: "suggestions" | "trending";
}

const COPY: Record<
  SocialDiscoveryPlaceholderProps["surface"],
  { title: string; description: string }
> = {
  suggestions: {
    title: "People you might know",
    description:
      "Discover people to connect with based on mutual friends and interests.",
  },
  trending: {
    title: "Trending users",
    description: "See who's making waves on the platform right now.",
  },
};

export function SocialDiscoveryPlaceholder({
  surface,
}: SocialDiscoveryPlaceholderProps): ReactElement {
  const copy = COPY[surface];
  return (
    <section
      data-testid={"social-discovery-placeholder-" + surface}
      aria-label={`${copy.title} (placeholder)`}
      className="flex flex-col gap-2 p-6"
    >
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.description}</p>
    </section>
  );
}
