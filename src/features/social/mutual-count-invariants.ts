/**
 * `mutual-count-invariants.ts` — Cross-batch invariants for the
 * mutual-friends / mutual-followers endpoints.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.A3.
 *
 * ## Purpose
 *
 * Single source of truth for the mutual-count cap contract every
 * Story 6.4 hook and component must obey. Importing this module
 * from `MutualPreview`, the mutual lists (`MutualFriendsList`,
 * `MutualFollowersList`), the mutual hooks (`useMutualFriends`,
 * `useMutualFollowers`), and the profile-sidebar surfaces is the
 * canonical way to assert compliance without sprinkling magic
 * numbers across the surface.
 *
 * ## What this file owns
 *
 *   1. **Preview cap.** The preview endpoint returns a server-capped
 *      subset of up to `MUTUAL_PREVIEW_CAP` rows. The UI never
 *      re-counts client-side; the "+N more" indicator is derived
 *      from the documented cap and the server's `total` field.
 *
 *   2. **List page size.** The list endpoint returns paginated
 *      rows with a server-capped page size of `MUTUAL_LIST_PAGE_SIZE`.
 *      The constant matches the documented backend default and the
 *      `useCursorPaginated` (or `useOffsetPaginated`) invocation
 *      the mutual hooks will use.
 *
 *   3. **Total hard cap.** The backend reports a server-capped
 *      `total` capped at `MUTUAL_TOTAL_HARD_CAP`. The UI clamps the
 *      reported total to this value and never paginates beyond it.
 *
 *   4. **Overflow helper.** `mutualCountOverflow(visible, total)`
 *      computes the "+N more" indicator. The helper is the only
 *      public function in this module; no other file is permitted to
 *      compute the overflow indicator ad-hoc.
 *
 *   5. **Frozen catalogue.** The `MUTUAL_COUNT_INVARIANTS` record
 *      exposes every constant as a single object so call-sites can
 *      iterate without naming each constant.
 *
 * ## What this file does NOT own
 *
 *   - The `useMutualFriends` / `useMutualFollowers` hooks — those
 *     land in `features/social/hooks/` (TKT-6.4.C2 / TKT-6.4.C3)
 *     and import the constants from here.
 *   - The `MutualPreview` component — that lives in
 *     `features/social/components/MutualPreview.tsx` (TKT-6.4.B1)
 *     and uses `mutualCountOverflow`.
 *   - The `MutualFriendsList` / `MutualFollowersList` pages — those
 *     live in `features/social/lists/` (TKT-6.4.E2 / TKT-6.4.E3).
 *
 * ## SSR-safety
 *
 * The module declares constants and a pure helper only. It reads no
 * `window`, `localStorage`, or other browser-only API. It is safe
 * to import from Server Components and from the App Router's route
 * modules.
 *
 * ## Source-of-truth update procedure
 *
 * The three numeric constants are documented in the backend
 * verification report shipped with `EPIC_6_4_A1.md` (the
 * Story 6.4 deliverable evidence file). If the backend team
 * reports a different cap, this is the single point of update —
 * the type system enforces that the constant is consumed by every
 * hook and component via the `mutualCountOverflow` helper, so a
 * value change here propagates without touching every call-site.
 */

// ─── Caps ─────────────────────────────────────────────────────────────────

/**
 * The maximum number of rows the mutual preview endpoint returns.
 *
 * Mirrors the documented backend preview cap. The preview surface
 * (`MutualPreview`, TKT-6.4.B1) renders up to this many avatars
 * followed by a "+N more" indicator when the total exceeds the
 * cap.
 *
 * The constant is intentionally NOT exported as a mutable variable
 * so an accidental global reassignment is a TypeScript error.
 */
export const MUTUAL_PREVIEW_CAP = 6 as const;

/**
 * The default page size the mutual list endpoint applies.
 *
 * Mirrors the documented backend cursor/offset page default. The
 * mutual hooks pass `limit = MUTUAL_LIST_PAGE_SIZE` to the SDK and
 * the `useCursorPaginated` / `useOffsetPaginated` primitive clamps
 * any caller-supplied `limit` to this value before requesting more
 * rows.
 */
export const MUTUAL_LIST_PAGE_SIZE = 20 as const;

/**
 * The maximum total the backend reports for the mutual endpoints.
 *
 * The backend caps the `total` field at this value to bound the
 * pagination cursor / offset. The UI clamps the reported total to
 * this value when computing the overflow indicator and never
 * paginates beyond it.
 */
export const MUTUAL_TOTAL_HARD_CAP = 500 as const;

// ─── Overflow helper ──────────────────────────────────────────────────────

/**
 * Compute the "+N more" indicator for a mutual preview.
 *
 * The helper is the canonical derivation for the overflow indicator
 * — no other module is permitted to compute it ad-hoc. The contract:
 *
 *   - Returns `0` when `total <= visible` (no overflow).
 *   - Otherwise returns `min(total - visible, MUTUAL_TOTAL_HARD_CAP - visible)`
 *     clamped to `0` (so the indicator never exceeds the documented
 *     hard cap).
 *
 * The helper is pure (no `Date.now()`, no `Math.random()`) so it is
 * safe to call inside `useMemo` and in the spec without flake.
 *
 * @example
 *   mutualCountOverflow(6, 18)  // 12
 *   mutualCountOverflow(6, 6)   // 0
 *   mutualCountOverflow(6, 500) // 494 (clamped to MUTUAL_TOTAL_HARD_CAP - visible)
 *   mutualCountOverflow(6, 999) // 494 (same; backend total is hard-capped)
 *   mutualCountOverflow(0, 0)   // 0
 */
export function mutualCountOverflow(visible: number, total: number): number {
  if (!Number.isFinite(visible) || !Number.isFinite(total)) return 0;
  if (visible < 0 || total < 0) return 0;
  if (total <= visible) return 0;
  const raw = total - visible;
  const cap = MUTUAL_TOTAL_HARD_CAP - visible;
  if (cap <= 0) return 0;
  return Math.min(raw, cap);
}

// ─── Frozen catalogue ─────────────────────────────────────────────────────

/**
 * Read-only record exposing every constant in this module. Re-exported
 * from `@/features/social` so list components and admin tools can
 * read `MUTUAL_COUNT_INVARIANTS.previewCap` without needing to
 * remember the exact identifier.
 */
export const MUTUAL_COUNT_INVARIANTS = Object.freeze({
  previewCap: MUTUAL_PREVIEW_CAP,
  listPageSize: MUTUAL_LIST_PAGE_SIZE,
  totalHardCap: MUTUAL_TOTAL_HARD_CAP,
});
