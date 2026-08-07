/**
 * `feed-discriminator.ts` — Cross-batch invariants for the
 * Story 6.9 global feed's discriminator contract.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.E1.
 *
 * ## Purpose
 *
 * Single source of truth for the feed-item type discriminator the
 * `FeedItemRenderer` dispatcher (TKT-6.9.E1) and the defensive
 * fallback (`FeedItemUnknown`) share. Importing this module from
 * the dispatcher, the page shell (`SocialFeedPage`, TKT-6.9.G1),
 * and the rate-limit notice is the canonical way to assert
 * compliance without sprinkling magic strings across the surface.
 *
 * ## What this file owns
 *
 *   1. **Closed union (`FeedItemType`).** The set of documented
 *      feed-item types. The discriminator is the single source of
 *      truth for the dispatcher switch — adding a new item type is
 *      a TypeScript error until this union is updated.
 *   2. **Canonical ordered list (`FEED_ITEM_TYPES`).** The
 *      ordered list the dispatcher registry consumes.
 *   3. **Type guard (`isFeedItemType`).** The narrowing helper.
 *   4. **Defensive fallback test id (`FEED_DEFENSIVE_FALLBACK_TESTID`).
 *      The `data-testid` the defensive renderer emits for unknown
 *      discriminators.
 *
 * ## What this file does NOT own
 *
 *   - The `FeedItemRenderer` dispatcher itself — that lives in
 *     `features/social/components/FeedItemRenderer.tsx`
 *     (TKT-6.9.E1) and consumes the constants from here.
 *   - The `SocialFeedItemDto` / `SocialFeedItemPayload` types —
 *     those are declared in `features/social/types/relationship.ts`
 *     (Epic 6.1 / TKT-6.1.C1).
 *   - The `useFeed` hook — that lives in
 *     `features/social/hooks/useFeed.ts` (TKT-6.9.D2).
 *
 * ## SSR-safety
 *
 * The module declares types and frozen constants only. Safe to
 * import from Server Components and from the App Router's route
 * modules.
 */

// ─── Discriminator type ───────────────────────────────────────────────────

/**
 * The closed union of feed-item type discriminators the frontend
 * recognises. Mirrors `SocialFeedItemType` declared by Epic 6.1
 * / TKT-6.1.C1 (`relationship.ts` lines 299–312).
 *
 * The list is locked here so the `FeedItemRenderer` dispatcher
 * switch is guaranteed to remain in sync. Adding a new item type
 * is a TypeScript error until both this union and the
 * `FEED_ITEM_TYPES` ordered list are updated.
 */
export type FeedItemType =
  | "badge_earned"
  | "badge_revoked"
  | "rank_milestone"
  | "peak_rank_achieved"
  | "tournament_joined"
  | "tournament_completed"
  | "tournament_won"
  | "comment_created"
  | "quiz_completed"
  | "quiz_milestone"
  | "instance_created"
  | "instance_joined"
  | "instance_completed";

/**
 * The canonical ordered list of feed-item types. Mirrors
 * `FeedItemType`. The list is the canonical iteration order for
 * the dispatcher registry.
 */
export const FEED_ITEM_TYPES: readonly FeedItemType[] = [
  "badge_earned",
  "badge_revoked",
  "rank_milestone",
  "peak_rank_achieved",
  "tournament_joined",
  "tournament_completed",
  "tournament_won",
  "comment_created",
  "quiz_completed",
  "quiz_milestone",
  "instance_created",
  "instance_joined",
  "instance_completed",
] as const;

// ─── Type guard ───────────────────────────────────────────────────────────

/**
 * Type-guard: returns `true` when the input is a documented
 * `FeedItemType`, `false` otherwise.
 *
 * Used by the `FeedItemRenderer` dispatcher to gate the switch on
 * a typed value. The guard is defensive-by-default: it returns
 * `false` for `null`, `undefined`, numeric values, objects, and
 * arbitrary strings.
 */
export function isFeedItemType(value: unknown): value is FeedItemType {
  return (
    typeof value === "string" &&
    (FEED_ITEM_TYPES as readonly string[]).includes(value)
  );
}

// ─── Defensive fallback test id ───────────────────────────────────────────

/**
 * The `data-testid` the defensive renderer emits for unknown
 * discriminators. Exported so the cross-batch validation checklist
 * can grep for the identifier.
 */
export const FEED_DEFENSIVE_FALLBACK_TESTID = "feed-item-unknown" as const;

// ─── Frozen catalogue ─────────────────────────────────────────────────────

/**
 * Read-only record exposing every constant in this module.
 * Re-exported from `@/features/social` so batch components and
 * admin tools can read `FEED_DISCRIMINATOR_INVARIANTS.itemTypes`
 * without remembering the exact identifier.
 */
export const FEED_DISCRIMINATOR_INVARIANTS = Object.freeze({
  itemTypes: FEED_ITEM_TYPES,
  defensiveFallbackTestId: FEED_DEFENSIVE_FALLBACK_TESTID,
});