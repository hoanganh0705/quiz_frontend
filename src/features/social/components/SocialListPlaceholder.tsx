"use client";

/**
 * `SocialListPlaceholder` — Canonical "Coming soon" placeholder for
 * the four list pages.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views
 *                (followers / following / friends / blocked).
 * Source ticket: TKT-6.2.C5.
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by every list page
 * when `phase6_social === 'placeholder'`. The component:
 *
 *   - Renders the list-kind-specific title and description copy.
 *   - Emits a Sentry breadcrumb via `addSocialListBreadcrumb` so
 *     `phase6_social === 'placeholder'` traffic is observable in
 *     Sentry's session-replay stream without needing a backend
 *     instrumentation change.
 *   - Is statically rendered. It calls no SWR / no service, and
 *     renders identical markup on server and client.
 *
 * ## Source of truth
 *
 * The canonical `SocialListKind` type and copy table live here. The
 * Batch-B `SocialListRouteGate` and the Batch-C `SocialListEmptyState`
 * (TKT-6.2.C3) both re-import `SocialListKind` from this module so
 * there is exactly one place to update the list-kind union.
 *
 * ## Replaces
 *
 * This file replaces the Batch-B minimal `SocialListPlaceholder`
 * (originally scaffolded under TKT-6.2.B1 / B2). The replacement
 * keeps the original export name (`SocialListPlaceholder`,
 * `SocialListKind`) so the Batch-B consumers do not need to be
 * touched.
 */

import type { ReactElement } from "react";

import type { SocialListKind as _SocialListKind } from "./SocialListKind";

export type SocialListKind = _SocialListKind;

interface SocialListPlaceholderProps {
  /** The list kind the placeholder represents. */
  kind: SocialListKind;
  /**
   * Optional target user id the list is conceptually about. The
   * placeholder does not surface the id in copy; it is accepted so
   * the call-site is type-compatible with the eventual live list
   * page components.
   */
  targetUserId?: string | null;
}

const COPY: Record<
  SocialListKind,
  { title: string; description: string }
> = {
  followers: {
    title: "Followers",
    description: "See who follows this user. Sign in to view the full list.",
  },
  following: {
    title: "Following",
    description: "See who this user follows. Sign in to view the full list.",
  },
  friends: {
    title: "Friends",
    description: "See this user's friends. Sign in to view the full list.",
  },
  blocked: {
    title: "Blocked users",
    description:
      "See the users you have blocked. Sign in to view your full list.",
  },
  "mutual-friends": {
    title: "Mutual friends",
    description: "See the friends you share with this user.",
  },
  "mutual-followers": {
    title: "Mutual followers",
    description: "See the followers you share with this user.",
  },
  activity: {
    title: "Activity",
    description: "See this user's recent activity.",
  },
  feed: {
    title: "Feed",
    description: "See the latest community activity.",
  },
};

/**
 * Canonical placeholder component. Server-renderable.
 */
export function SocialListPlaceholder({
  kind,
}: SocialListPlaceholderProps): ReactElement {
  const copy = COPY[kind];
  return (
    <section
      data-testid={`social-list-placeholder-${kind}`}
      aria-label={`${copy.title} (placeholder)`}
      className="flex flex-col gap-2 p-6"
    >
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.description}</p>
    </section>
  );
}