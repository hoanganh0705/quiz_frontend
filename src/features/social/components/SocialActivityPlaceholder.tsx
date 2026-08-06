/**
 * `SocialActivityPlaceholder` — Canonical "Coming soon" placeholder
 * for the per-user activity stream route.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B5.
 *
 * ## What this component owns
 *
 * The static, flag-gated placeholder rendered by the activity
 * route scaffold when `phase6_social_activity === 'placeholder'`.
 * The component:
 *
 *   - Renders the placeholder shell matching the eventual activity
 *     stream layout.
 *   - Is statically rendered. It calls no SWR / no hook, and
 *     renders identical markup on server and client.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API. It is safe to import from Server Components and
 * from the App Router's route modules.
 */

import type { ReactElement } from "react";

interface SocialActivityPlaceholderProps {
  /**
   * Optional target user id the placeholder is conceptually about.
   * The placeholder does not surface the id in copy; it is accepted
   * so the call-site is type-compatible with the eventual live
   * activity stream component.
   */
  targetUserId?: string | null;
}

/**
 * Canonical placeholder for the activity stream route.
 * Server-renderable.
 */
export function SocialActivityPlaceholder({
  targetUserId,
}: SocialActivityPlaceholderProps = {}): ReactElement {
  return (
    <section
      data-testid="social-activity-placeholder"
      data-target-user-id={targetUserId ?? undefined}
      aria-label="Activity stream (placeholder)"
      className="flex flex-col gap-2 p-6"
    >
      <h2 className="text-lg font-semibold">Activity</h2>
      <p className="text-sm text-muted-foreground">
        See this user&apos;s recent activity on the platform. Sign in to view
        the full stream.
      </p>
    </section>
  );
}
