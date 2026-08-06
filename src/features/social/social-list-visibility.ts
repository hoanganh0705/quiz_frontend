/**
 * `social-list-visibility.ts` — The privacy-aware visibility union
 * every Story 6.2+ list hook surfaces.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views (initial
 *                consumer); Epic 6.3 / Epic 6.4 reuse the type.
 * Source story:  Story 6.2 (visibility hook); Epic 6.4 mutuals +
 *                activity hooks import the type from this file.
 * Source ticket: TKT-6.2.D2 (initial definition). Epic 6.4
 *                reuses the type verbatim.
 *
 * ## Purpose
 *
 * The single privacy-aware visibility discriminator that every
 * list hook in Story 6.2+ returns on its `visibility` field. The
 * type is intentionally shared across epics so the UI primitives
 * (`PrivacyRestrictedNotice`, `MutualPreview`, `UserStatsCard`,
 * etc.) can branch on a single union.
 *
 * ## Why a separate file
 *
 * The Epic 6.2 `useSocialListVisibility` hook (TKT-6.2.D2)
 * exposes a *flag* shape (`canViewFriends`, `canViewBlocked`,
 * `canViewCounts`, …) that is the correct answer for the
 * Epic 6.2 list pages. The Epic 6.3 analytics hooks
 * (`useUserSocialStats`, etc.) and the Epic 6.4 mutual / activity
 * hooks instead need a **discriminated union** so each hook can
 * map a particular backend error code to a particular privacy
 * branch. The shared union lives here so the consumer primitives
 * can branch on a single string discriminator across epics.
 *
 * ## Value contract
 *
 *   - `'visible'`           — the viewer can see the list; render
 *                            normally.
 *   - `'private'`           — the target has set the list to
 *                            private or the viewer is not
 *                            authorised; render the privacy notice.
 *   - `'blocked_viewer'`    — the target has blocked the viewer;
 *                            render the privacy notice.
 *   - `'blocked_by_viewer'` — the viewer has blocked the target;
 *                            the list is hidden behind the block.
 *   - `'not_found'`         — the target user does not resolve;
 *                            render the privacy notice.
 *
 * The union is **closed** — adding a value is a TypeScript error
 * in every `switch` over the union across the codebase, which
 * forces a documented contract change.
 */

/**
 * The closed privacy-aware visibility union. The discriminator is
 * the single branching point for every list hook in Story 6.2+
 * that needs to render a privacy notice instead of a populated
 * list.
 */
export type SocialListVisibility =
  | "visible"
  | "private"
  | "blocked_viewer"
  | "blocked_by_viewer"
  | "not_found";

/**
 * The exhaustive ordered tuple of `SocialListVisibility` values.
 * `as const` so the literal types flow into the call sites.
 */
export const SOCIAL_LIST_VISIBILITIES = [
  "visible",
  "private",
  "blocked_viewer",
  "blocked_by_viewer",
  "not_found",
] as const satisfies readonly SocialListVisibility[];

/**
 * Type guard — `value is SocialListVisibility`.
 */
export function isSocialListVisibility(
  value: unknown,
): value is SocialListVisibility {
  return (
    typeof value === "string" &&
    (SOCIAL_LIST_VISIBILITIES as readonly string[]).includes(value)
  );
}
