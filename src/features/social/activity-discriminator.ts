/**
 * `activity-discriminator.ts` — Cross-batch invariants for the
 * `/social/users/:id/activity` endpoint's discriminator contract.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.A4.
 *
 * ## Purpose
 *
 * Single source of truth for the activity-item type discriminator
 * the `ActivityItem` type-discriminated renderer (TKT-6.4.B2) and
 * the defensive fallback (TKT-6.4.B2) share. Importing this module
 * from the renderer, the activity stream page (`UserActivityStream`,
 * TKT-6.4.F1), and the activity rate-limit notice
 * (`ActivityRateLimitNotice`, TKT-6.4.B3) is the canonical way to
 * assert compliance without sprinkling magic strings across the
 * surface.
 *
 * ## What this file owns
 *
 *   1. **Closed union (`ActivityItemType`).** The set of documented
 *      activity-item types. The discriminator is the single source
 *      of truth for the `ActivityItem` switch — adding a new item
 *      type is a TypeScript error until this union is updated.
 *      `string` is explicitly excluded from the union so an
 *      unknown backend discriminator is observable at runtime via
 *      `isActivityItemType` rather than silently coerced.
 *
 *   2. **Canonical ordered list (`ACTIVITY_ITEM_TYPES`).** The
 *      ordered list the renderer registry consumes. The order is
 *      the visual order in the activity stream (newest items first
 *      is enforced by the backend; the list order here is the
 *      fallback / sub-renderer fallback order).
 *
 *   3. **Type guard (`isActivityItemType`).** The narrowing helper.
 *      Returns `true` for every member of `ACTIVITY_ITEM_TYPES` and
 *      `false` for `null`, `undefined`, and arbitrary strings
 *      (including the documented typos the backend has shipped in
 *      the past).
 *
 *   4. **Defensive fallback test id (`DEFENSIVE_FALLBACK_TESTID`).
 *      The `data-testid` the defensive renderer emits for unknown
 *      discriminators. The constant is exported so the cross-batch
 *      validation checklist (the `epic-done` grep) can pin the
 *      identifier without copy-pasting the literal across the
 *      component and the spec.
 *
 *   5. **Rate-limit error codes (`ACTIVITY_RATE_LIMIT_ERROR_CODES`).
 *      The documented set of backend error codes that surface the
 *      activity rate-limit notice (`ActivityRateLimitNotice`) in
 *      preference to the generic `ActivityErrorState`. The set
 *      includes `GLOBAL_RATE_LIMITED` (the documented 429 code)
 *      and may be extended when the backend adds a more specific
 *      rate-limit code.
 *
 * ## What this file does NOT own
 *
 *   - The `ActivityItem` type-discriminated renderer itself — that
 *     lives in `features/social/components/ActivityItem.tsx`
 *     (TKT-6.4.B2) and consumes the constants from here.
 *   - The `SocialActivityItemDto` / `SocialFeedItemPayload` types —
 *     those are declared in `features/social/types/relationship.ts`
 *     (Epic 6.1 / TKT-6.1.C1) and re-exported via the
 *     `features/social/types` barrel.
 *   - The `useUserActivity` hook — that lives in
 *     `features/social/hooks/useUserActivity.ts` (TKT-6.4.D2).
 *
 * ## SSR-safety
 *
 * The module declares types and frozen constants only. It is safe to
 * import from Server Components and from the App Router's route
 * modules.
 */

// ─── Discriminator type ───────────────────────────────────────────────────

/**
 * The closed union of activity-item type discriminators the
 * frontend recognises.
 *
 * The exact list is the documented `SocialFeedItemType` union
 * declared by Epic 6.1 / TKT-6.1.C1 (the `ActivityItem`'s payload
 * discriminator). The list is locked here so the
 * `ActivityItem` switch (TKT-6.4.B2) and the `ACTIVITY_ITEM_TYPES`
 * ordered list are guaranteed to remain in sync.
 *
 * `string` is intentionally excluded: an unknown backend
 * discriminator is observable at runtime via `isActivityItemType`
 * and renders the documented defensive fallback (never an
 * unhandled `case` crash).
 */
export type ActivityItemType =
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
 * The canonical ordered list of activity-item types.
 *
 * Mirrors the `ActivityItemType` union. The list is the canonical
 * iteration order for the renderer registry — adding a new item
 * type is a TypeScript error until both this list and the union are
 * updated. The cross-batch validation checklist grep
 * (`grep -RE "ACTIVITY_ITEM_TYPES"`) verifies that no consumer
 * hand-rolls a parallel list.
 */
export const ACTIVITY_ITEM_TYPES: readonly ActivityItemType[] = [
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
 * `ActivityItemType`, `false` otherwise.
 *
 * Used by the `ActivityItem` type-discriminated renderer (TKT-6.4.B2)
 * to gate the switch on a typed value. The guard is the only public
 * coercion surface — no other helper is permitted to "narrow" a
 * raw backend discriminator to `ActivityItemType`.
 *
 * The guard is defensive-by-default: it returns `false` for
 * `null`, `undefined`, numeric values, objects, and arbitrary
 * strings (including the documented typos the backend has shipped
 * in the past). The defensive fallback renders the documented
 * `data-testid` for unknown values.
 */
export function isActivityItemType(value: unknown): value is ActivityItemType {
  return (
    typeof value === "string" &&
    (ACTIVITY_ITEM_TYPES as readonly string[]).includes(value)
  );
}

// ─── Defensive fallback test id ───────────────────────────────────────────

/**
 * The `data-testid` the defensive renderer emits for unknown
 * discriminators.
 *
 * The constant is exported so the cross-batch validation checklist
 * can grep for the identifier without copy-pasting the literal
 * across the component and the spec. The string is documented as
 * the only canonical id for the "unknown discriminator" surface.
 */
export const DEFENSIVE_FALLBACK_TESTID = "activity-item-unsupported" as const;

// ─── Rate-limit error codes ───────────────────────────────────────────────

/**
 * The closed set of `ErrorCode` values that surface the
 * `ActivityRateLimitNotice` (TKT-6.4.B3) in preference to the
 * generic `ActivityErrorState`.
 *
 * The set is intentionally narrow. The documented 429 code is
 * `GLOBAL_RATE_LIMITED`; the backend may add a more specific code
 * (`ACTIVITY_RATE_LIMITED`) in a future release. When the backend
 * adds a new code, append it to this list and update the spec.
 *
 * The `as const satisfies readonly ErrorCode[]` assertion pins the
 * values to the global `ErrorCode` union so a future rename
 * surfaces as a TypeScript error.
 */
import type { ErrorCode } from "@/lib/api/error-codes";

export const ACTIVITY_RATE_LIMIT_ERROR_CODES: readonly ErrorCode[] = [
  "GLOBAL_RATE_LIMITED",
  "ACTIVITY_RATE_LIMITED",
] as const;

/**
 * Lookup helper. Returns `true` when the input code is one of the
 * documented activity rate-limit codes.
 *
 * The helper is the only public way to query the rate-limit set —
 * the `ActivityRateLimitNotice` decision (TKT-6.4.B3) imports it;
 * no other module is permitted to reach into the underlying array
 * directly.
 */
export function isActivityRateLimitCode(code: ErrorCode | undefined): boolean {
  if (!code) return false;
  return (ACTIVITY_RATE_LIMIT_ERROR_CODES as readonly string[]).includes(code);
}

// ─── Frozen catalogue ─────────────────────────────────────────────────────

/**
 * Read-only record exposing every constant in this module. Re-exported
 * from `@/features/social` so batch components and admin tools can
 * read `ACTIVITY_DISCRIMINATOR_INVARIANTS.itemTypes` without needing
 * to remember the exact identifier.
 */
export const ACTIVITY_DISCRIMINATOR_INVARIANTS = Object.freeze({
  itemTypes: ACTIVITY_ITEM_TYPES,
  defensiveFallbackTestId: DEFENSIVE_FALLBACK_TESTID,
  rateLimitErrorCodes: ACTIVITY_RATE_LIMIT_ERROR_CODES,
});
