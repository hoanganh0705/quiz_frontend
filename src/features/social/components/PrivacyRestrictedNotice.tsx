"use client";

/**
 * `PrivacyRestrictedNotice` — Single privacy-notice component used
 * wherever a list must not leak its content to a non-permitted
 * viewer.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.F1.
 *
 * ## What this component owns
 *
 * The two privacy-notice variants used by the friends list and the
 * blocked list:
 *
 *   - `variant: 'not_available'` — generic copy: "This information
 *     isn't available right now."
 *   - `variant: 'friends_only'` — friends-list copy: "Only the user
 *     and their friends can see this."
 *
 * Both variants are intentionally generic. The component must
 * never leak relationship state (e.g. "you've been blocked", "you
 * aren't friends") into the DOM or analytics payload because the
 * whole point of the privacy boundary is to deny the non-permitted
 * viewer enough information to infer the relationship.
 *
 * ## Why a Client Component
 *
 * Marked `"use client"` for parity with the other list primitives
 * (`SocialListRow`, `SocialListEmptyState`, etc.). The component is
 * purely presentational; no hooks are called.
 *
 * ## Analytics
 *
 * The component does NOT emit an analytics payload on mount. The
 * invariant is asserted by the co-located test.
 */

import { type ReactElement } from "react";

import { type SocialListKind } from "./SocialListKind";

export type PrivacyRestrictedNoticeVariant = "not_available" | "friends_only";

interface PrivacyRestrictedNoticeProps {
  variant: PrivacyRestrictedNoticeVariant;
  /**
   * The list kind the privacy notice is conceptually about. Carried
   * as a data attribute so end-to-end tests can assert the right
   * notice is rendered for the right route, but never surfaces in
   * the user-visible copy.
   */
  resourceKind: SocialListKind;
}

const COPY: Record<PrivacyRestrictedNoticeVariant, { title: string; body: string }> = {
  not_available: {
    title: "Not available",
    body: "This information isn't available right now.",
  },
  friends_only: {
    title: "For friends only",
    body: "Only the user and their friends can see this.",
  },
};

/**
 * Render a privacy-restricted notice.
 */
export function PrivacyRestrictedNotice(
  props: PrivacyRestrictedNoticeProps,
): ReactElement {
  const { variant, resourceKind } = props;
  const copy = COPY[variant];
  return (
    <section
      data-testid={`privacy-restricted-notice-${variant}`}
      data-resource-kind={resourceKind}
      role="status"
      aria-label={copy.title}
      className="flex flex-col gap-2 p-6"
    >
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
    </section>
  );
}