/**
 * `SocialMutualsPlaceholder` — Canonical "Coming soon" placeholder
 * for the mutual-friends / mutual-followers routes.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B5.
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by the mutual route
 * scaffolds when `phase6_social_mutuals === 'placeholder'`. The
 * component:
 *
 *   - Renders the placeholder shell matching the eventual mutual
 *     layout (preview row + list shape).
 *   - Accepts a `kind: 'friends' | 'followers'` so the route
 *     scaffold renders the appropriate placeholder.
 *   - Emits a Sentry breadcrumb via the centralised
 *     `phase6:6.4` category so `phase6_social_mutuals === 'placeholder'`
 *     traffic is observable in Sentry's session-replay stream.
 *
 * The component is statically rendered. It calls no SWR / no hook,
 * and renders identical markup on server and client.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API. It is safe to import from Server Components and
 * from the App Router's route modules.
 */

import type { ReactElement } from "react";

import type { MutualPreviewKind } from "@/features/social/components/MutualPreview";

interface SocialMutualsPlaceholderProps {
  /** The mutual surface the placeholder represents. */
  kind: MutualPreviewKind;
  /**
   * Optional target user id the placeholder is conceptually about.
   * The placeholder does not surface the id in copy; it is accepted
   * so the call-site is type-compatible with the eventual live
   * mutual page components.
   */
  targetUserId?: string | null;
}

const COPY: Record<
  MutualPreviewKind,
  { title: string; description: string }
> = {
  friends: {
    title: "Mutual friends",
    description:
      "See the friends you share with this user. Sign in to view the full list.",
  },
  followers: {
    title: "Mutual followers",
    description:
      "See the followers you share with this user. Sign in to view the full list.",
  },
};

/**
 * Canonical placeholder for the mutual routes.
 * Server-renderable.
 */
export function SocialMutualsPlaceholder({
  kind,
  targetUserId,
}: SocialMutualsPlaceholderProps): ReactElement {
  const copy = COPY[kind];
  return (
    <section
      data-testid={`social-mutuals-placeholder-${kind}`}
      data-kind={kind}
      data-target-user-id={targetUserId ?? undefined}
      aria-label={`${copy.title} (placeholder)`}
      className="flex flex-col gap-2 p-6"
    >
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.description}</p>
    </section>
  );
}
