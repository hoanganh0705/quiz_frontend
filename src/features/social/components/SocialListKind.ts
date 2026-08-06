/**
 * `SocialListKind` — Union of the four list kinds Story 6.2 renders.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source tickets: TKT-6.2.B1, B2, C1, C3, C5 (cross-batch shared type).
 *
 * This module exists so the union has a single source of truth
 * (rather than being redeclared in each consumer). It is exported
 * via `SocialListPlaceholder.tsx` (re-exports as `SocialListKind`)
 * and via the components / hooks that need it.
 */

/**
 * `SocialListKind` — Union of the list kinds Story 6.2 renders,
 * extended with the Story 6.4 mutual / activity resource kinds.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source tickets: TKT-6.2.B1, B2, C1, C3, C5 (cross-batch shared type).
 *
 * This module exists so the union has a single source of truth
 * (rather than being redeclared in each consumer). It is exported
 * via `SocialListPlaceholder.tsx` (re-exports as `SocialListKind`)
 * and via the components / hooks that need it.
 *
 * ## Story 6.4 extensions
 *
 * The mutual / activity routes (TKT-6.4.G1 / G2) consume
 * `PrivacyRestrictedNotice` for the defensive unauthenticated
 * branch. The notice's `resourceKind` field is used by end-to-end
 * tests to assert the right notice is rendered for the right route
 * — for accuracy, the mutual / activity route gates need to pass
 * the matching resource kind. The new variants are intentionally
 * additive so Epic 6.2 / 6.3 consumers compile unchanged.
 */
export type SocialListKind =
  | "followers"
  | "following"
  | "friends"
  | "blocked"
  | "mutual-friends"
  | "mutual-followers"
  | "activity";

export const SOCIAL_LIST_KINDS: readonly SocialListKind[] = [
  "followers",
  "following",
  "friends",
  "blocked",
  "mutual-friends",
  "mutual-followers",
  "activity",
] as const;