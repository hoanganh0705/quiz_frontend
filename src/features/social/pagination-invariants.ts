/**
 * `pagination-invariants.ts` — Cross-batch invariants for the four
 * read-only social-graph lists (followers / following / friends /
 * blocked).
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.2 (lines 139–180).
 * Source ticket: TKT-6.2.A3.
 *
 * ## Purpose
 *
 * Single source of truth for the pagination / storage conventions every
 * Story 6.2 list page and every Story 6.2 URL state helper must obey.
 * Importing this module from a list page, a hook, or a service wrapper
 * is the canonical way to assert compliance without sprinkling magic
 * numbers and forbidden-key lists across the surface.
 *
 * ## What this file owns
 *
 *   1. **Pagination kind.** The followers / following / friends /
 *      blocked endpoints all use cursor pagination
 *      (`{ kind: 'cursor', limit, nextCursor, hasNextPage }`). The
 *      Epic 6.1 hooks (`useFollowers`, `useFollowing`, `useFriends`,
 *      `useBlockedUsers`) already pass `paginationKind: 'cursor'` to
 *      `useCursorPaginated`. This constant makes that contract
 *      explicit and prevents accidental offset-branch configuration.
 *
 *   2. **Default and max `limit`.** The list hooks currently do not
 *      pass a `limit` (so the backend default applies). The frontend
 *      constant here exists so future call-sites do not invent a
 *      different default. The `maxLimit` mirrors the documented Phase
 *      6 backend cursor-page cap; `setLimit(n)` (the URL-state helper
 *      introduced in TKT-6.2.B3) clamps `n` to this value.
 *
 *   3. **Forbidden storage keys.** `followId` and `friendshipId` are
 *      the documented unstable internal identifiers (Phase 6 Risks
 *      line 54). This module exports the canonical "do not write
 *      these names to any persistent store or URL key" list. The
 *      Phase-6 lint-invariants script
 *      (`scripts/phase6-lint-invariants.mjs`) enforces this on the
 *      `features/social/**` tree; this constant is the single import
 *      the list components use to keep themselves compliant.
 *
 * ## What this file does NOT own
 *
 *   - The DTO adapters that strip leaked `followId` / `friendshipId`
 *     identifiers from incoming responses — those live in
 *     `features/social/dto-adapters.ts` (TKT-6.1.C2).
 *   - The SWR cache-key factories — those live on `SOCIAL_CACHE_KEYS`
 *     in `features/social/types/relationship.ts` (TKT-6.1.C1).
 *   - The list page components themselves — those land in Batches E
 *     and F (TKT-6.2.E1 → TKT-6.2.F2).
 *
 * ## SSR-safety
 *
 * The module reads no `window`, `localStorage`, or other browser-only
 * API. It is safe to import from Server Components and from the App
 * Router's route modules.
 */

import type { SocialPaginationKind } from "@/features/social/types";

/**
 * Pagination-kind discriminator for every Story 6.2 list endpoint.
 *
 * All five Story 6.2 endpoints (`GET /social/users/:id/followers`,
 * `GET /social/users/:id/following`, `GET /social/users/:id/friends`,
 * `GET /social/blocked`, `GET /social/counts` via the social counts
 * badge) emit cursor-paginated envelopes through `useCursorPaginated`.
 *
 * The constant is typed as the `SocialPaginationKind` discriminated
 * union member so an accidental drift to `'offset'` is a type error.
 */
export const SOCIAL_GRAPH_PAGINATION_KIND = "cursor" as const satisfies SocialPaginationKind;

/**
 * Default `limit` value used by the list hooks when none is supplied
 * to the SDK.
 *
 * Mirrors the documented Phase 6 backend cursor-page default; the
 * Epic 6.1 hooks rely on the server-side default rather than passing
 * `limit` explicitly. The constant exists so future call-sites (e.g.
 * the Batch-B URL state helper) can clamp user input without
 * inventing their own number.
 */
export const SOCIAL_GRAPH_DEFAULT_LIMIT = 20;

/**
 * Maximum `limit` value the list hooks and the URL state helper will
 * accept.
 *
 * The URL state helper (`useSocialListUrlState` in TKT-6.2.B3) clamps
 * any caller-supplied `limit` to this value before writing it to the
 * URL. The backend rejects larger limits; the clamp keeps the URL
 * round-trip valid.
 */
export const SOCIAL_GRAPH_MAX_LIMIT = 100;

/**
 * The forbidden storage-key fragments that no Story 6.2 list surface
 * may write to `localStorage`, `sessionStorage`, a URL search-param,
 * or any Sentry analytics payload.
 *
 * `followId` and `friendshipId` are unstable internal identifiers
 * (Phase 6 Risks line 54). `offset` is forbidden because the Story
 * 6.2 surface uses cursor pagination — a literal `offset` URL key
 * would imply the surface supports offset, which it does not.
 *
 * The `phase6-lint-invariants` script enforces this list on
 * `features/social/**`; this constant is the single import the list
 * components use to keep themselves compliant.
 */
export const FORBIDDEN_SOCIAL_STORAGE_KEYS = [
  "followId",
  "friendshipId",
  "offset",
] as const;

/**
 * The supported URL search-param keys for Story 6.2 list pages.
 *
 * The list pages own `cursor` and `limit` in the URL; no other keys
 * are recognised. Any URL key outside this list is treated as
 * unrelated by the URL state helper (`useSocialListUrlState`).
 */
export const SOCIAL_GRAPH_URL_KEYS = ["cursor", "limit"] as const;

/**
 * Type of a single URL key accepted by `useSocialListUrlState`.
 */
export type SocialGraphUrlKey = (typeof SOCIAL_GRAPH_URL_KEYS)[number];

/**
 * Read-only record exposing every constant in this module. Re-exported
 * from `@/features/social` so list components can read
 * `SOCIAL_GRAPH_PAGINATION_INVARIANTS.paginationKind` without needing
 * to remember the exact identifier.
 */
export const SOCIAL_GRAPH_PAGINATION_INVARIANTS = Object.freeze({
  paginationKind: SOCIAL_GRAPH_PAGINATION_KIND,
  defaultLimit: SOCIAL_GRAPH_DEFAULT_LIMIT,
  maxLimit: SOCIAL_GRAPH_MAX_LIMIT,
  forbiddenStorageKeys: FORBIDDEN_SOCIAL_STORAGE_KEYS,
  urlKeys: SOCIAL_GRAPH_URL_KEYS,
});
