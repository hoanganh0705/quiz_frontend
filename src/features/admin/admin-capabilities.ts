/**
 * `features/admin/admin-capabilities.ts`
 *
 * Source epic:   Epic 7.1 — Phase 7 SDK coverage, `usePermission` selector,
 *                 admin role guard, typed-confirm dialog, and audit-aware
 *                 action primitives.
 * Source ticket: TKT-7.1.A2.
 *
 * ## What this module owns
 *
 * The Phase 7 backend capability catalogue — a single source of truth in
 * code for the cross-cutting invariants every admin hook, service, and
 * component in this epic must satisfy:
 *
 *   1. `ADMIN_ENDPOINTS` — the documented Phase 7 endpoint inventory.
 *   2. `IRREVERSIBLE_OPERATIONS` — the documented irreversible-confirm
 *      catalogue; each entry has an `operation`, a `confirmString`, and
 *      the `backendCode` the backend returns when confirm is missing.
 *   3. `AUDIT_LOG_EXPOSED` — whether the backend exposes an admin-side
 *      audit log endpoint. Defaults to `false` until verified.
 *
 * The catalogue is consumed by:
 *
 *   - `usePermission` (TKT-7.1.B2) — for permission gating.
 *   - `useTypedConfirm` (TKT-7.1.B4) and `TypedConfirmDialog`
 *     (TKT-7.1.C5) — for typed-confirm strings.
 *   - The audit-shell integration test (TKT-7.1.E9) — for invariants.
 *   - The `verify-sdk-coverage` extension (TKT-7.1.A6) — for endpoint
 *     gating.
 *
 * ## How to regenerate
 *
 * When the backend adds a new Phase 7 endpoint or renames a permission:
 *
 *   1. Update `ADMIN_ENDPOINTS` (or `IRREVERSIBLE_OPERATIONS`).
 *   2. Add the typed-confirm string to the irreversible-confirm
 *      catalogue (TKT-7.1.A5) if the endpoint is irreversible.
 *   3. Add the permission name to the typed `PERMISSIONS` map
 *      (TKT-7.1.A4).
 *
 * The co-located spec (per ticket testing checklist) locks the catalogue
 * shape against unintentional blanks.
 */

/**
 * Documented Phase 7 endpoint inventory.
 *
 * The list is sourced from the master plan Phase 7 §Required Endpoints
 * (lines 475–483 of `INTEGRATION_MASTER_PLAN.md`). The list is
 * read-only here; the `verify-sdk-coverage` extension (TKT-7.1.A6)
 * reads from a parallel OpenAPI-derived list and asserts SDK presence.
 *
 * Keep this list aligned with the master plan; the SDK coverage script
 * is the authoritative gate.
 */
export const ADMIN_ENDPOINTS = [
  // Review moderation (Story 7.5)
  'GET /reviews/reports',
  'PATCH /reviews/reports/:reportId',

  // Comment moderation (Story 7.6)
  'GET /comments/reports',
  'PATCH /comments/reports/:reportId',
  'POST /comments/:commentId/hide',
  'POST /comments/:commentId/restore',

  // Tag admin (Story 7.3)
  'POST /tags',
  'PATCH /tags/:id',
  'DELETE /tags/:id',
  'POST /tags/:id/restore',

  // Category admin (Story 7.4)
  'POST /categories',
  'PATCH /categories/:id',
  'DELETE /categories/:id',
  'POST /categories/:id/restore',

  // Ranking admin (Story 7.9)
  'POST /rankings/admin/recalculate',
  'POST /rankings/admin/reset',
  'POST /rankings/admin/consistency-check',

  // Achievement admin (Story 7.8)
  'POST /achievements/admin/users/:userId/reevaluate',
  'DELETE /achievements/admin/users/:userId/badges/:badgeId',

  // Tournament admin (Story 7.7)
  'POST /tournaments',
  'PATCH /tournaments/:id',
  'DELETE /tournaments/:id',

  // User-role grant (Story 7.10) — exact verb set is verified against the
  // backend OpenAPI artifact in TKT-7.1.A1; this entry covers the social-
  // admin mount.
  'POST /admin/users/:userId/roles',
] as const;

export type AdminEndpoint = (typeof ADMIN_ENDPOINTS)[number];

/**
 * Documented irreversible-confirm catalogue.
 *
 * Every entry is an admin operation that the backend declares
 * irreversible; the UI must require a typed-confirm string matching
 * `confirmString` before the destructive action is dispatched.
 *
 * The catalogue is consumed by `useTypedConfirm` (TKT-7.1.B4) and
 * `TypedConfirmDialog` (TKT-7.1.C5) so the copy and the exact string
 * match the backend's `IRREVERSIBLE_CONFIRM_REQUIRED` contract.
 *
 * `confirmString` must be:
 *
 *   - case-sensitive (whitespace-sensitive match; per the master plan
 *     Phase 7 Risks line 495–496).
 *   - at least `minLength` characters long (per the documented
 *     invariants in `irreversible-confirm-invariants.ts`).
 *   - unique within the catalogue.
 */
export type IrreversibleAdminOperation =
  | 'ranking.recalculate'
  | 'ranking.reset'
  | 'tournament.delete'
  | 'role.revoke'
  | 'role.grant'
  // TKT-7.5.B2 — review-moderation irreversible operations. The
  // `hide_review` action hides the offending review from public
  // surfaces; the `delete_review` action removes it permanently.
  // Both surface a typed-confirm dialog before the destructive PATCH
  // / DELETE is dispatched. Confirm strings satisfy the documented
  // invariants (minLength 8, uppercase, whitespace-significant,
  // non-trivial) and are unique within this catalogue.
  | 'review.hide'
  | 'review.delete';

export const IRREVERSIBLE_OPERATIONS: ReadonlyArray<{
  readonly operation: IrreversibleAdminOperation;
  readonly confirmString: string;
  readonly backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED';
}> = [
  {
    operation: 'ranking.recalculate',
    confirmString: 'RECALCULATE RANKINGS',
    backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
  {
    operation: 'ranking.reset',
    confirmString: 'RESET RANKING PERIOD',
    backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
  {
    operation: 'tournament.delete',
    confirmString: 'DELETE TOURNAMENT',
    backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
  {
    operation: 'role.revoke',
    confirmString: 'REVOKE ROLE',
    backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
  {
    operation: 'role.grant',
    confirmString: 'GRANT ROLE',
    backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
  {
    operation: 'review.hide',
    confirmString: 'HIDE REVIEW',
    backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
  {
    operation: 'review.delete',
    confirmString: 'DELETE REVIEW',
    backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED',
  },
] as const;

/**
 * Whether the backend exposes an admin-side audit log endpoint.
 *
 * Defaults to `false` until verified against the live OpenAPI artifact
 * (per `TKT-7.1.A1` evidence). When `false`, Story 7.11 must render the
 * documented "audit log not exposed" degradation notice rather than
 * build a stub.
 */
export const AUDIT_LOG_EXPOSED: boolean = false;

/**
 * Per-operation helper. Returns the typed-confirm string for an
 * irreversible operation, or `null` when the operation is not in the
 * catalogue. The helper is the single source of typed-confirm lookup.
 *
 * @example
 *   getIrreversibleConfirmString('ranking.reset') // 'RESET RANKING PERIOD'
 *   getIrreversibleConfirmString('tag.delete')    // null
 */
export function getIrreversibleConfirmString(
  operation: IrreversibleAdminOperation,
): string | null {
  const entry = IRREVERSIBLE_OPERATIONS.find((e) => e.operation === operation);
  return entry ? entry.confirmString : null;
}
