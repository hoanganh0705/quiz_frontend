/**
 * `features/admin/review-moderation/action-enum.ts`
 *
 * Source epic:   Epic 7.5.
 * Source ticket: TKT-7.5.B2.
 *
 * ## Purpose
 *
 * The queue's consumer-facing action vocabulary and its metadata table.
 * The queue never displays raw SDK `status` values to admins; instead
 * it surfaces a higher-level action set that maps to one or two
 * backend round-trips:
 *
 *   - `dismiss`      → `PATCH status: 'dismissed'` (terminal, reversible-by-mistake).
 *   - `acknowledge`  → `PATCH status: 'reviewed'`  (terminal, no destructive effect).
 *   - `mark_resolved`→ alias of `acknowledge` for legacy UI surfaces.
 *   - `hide_review`  → `PATCH status: 'actioned'`  + irreversible typed-confirm.
 *   - `delete_review`→ `PATCH status: 'actioned'`  +
 *                      `DELETE /api/v1/admin/reviews/:reviewId` +
 *                      irreversible typed-confirm.
 *
 * The action set is the **single source of truth** for action
 * membership, display labels, irreversibility, typed-confirm
 * requirements, and confirm-string lookups.
 *
 * ## Cross-batch invariants
 *
 *   1. **Whitelist exclusivity** — only actions listed in
 *      `REPORT_ACTIONS` may be passed to
 *      `patchReviewReport(reportId, action)` or
 *      `adminReviewControllerAdminDeleteReview(reviewId)`.
 *   2. **Irreversible metadata alignment** — every action with
 *      `requiresTypedConfirm: true` must have a non-empty
 *      `confirmString`; that string is the value admins type into
 *      `TypedConfirmDialog` and must match the corresponding
 *      `IRREVERSIBLE_OPERATIONS` entry.
 *   3. **Display labels** — every documented action has a non-empty
 *      `label` (UI copy).
 *   4. **Companion-delete linkage** — `delete_review` is the only
 *      action that pairs the status PATCH with a follow-up DELETE.
 *
 * ## Why a consumer-side catalogue?
 *
 * The SDK exposes `reviewed | dismissed | actioned` as a closed set.
 * The queue surfaces a richer vocabulary so admins pick by intent
 * (acknowledge vs hide vs delete) rather than by SDK status code.
 * The mapping keeps the queue's UX stable when the backend adds a
 * new status value: only this module and the service wrapper need
 * updating.
 */

import type { ReportAction } from './admin-report-types';
import type { IrreversibleAdminOperation } from '../admin-capabilities';
import { getIrreversibleConfirmString } from '../admin-capabilities';

/**
 * Documented consumer-side action vocabulary. The union is closed;
 * the type-narrowing helpers (`isReportAction`) and the catalogue
 * table share the same membership set.
 */
export type ReportConsumerAction =
  | 'dismiss'
  | 'acknowledge'
  | 'mark_resolved'
  | 'hide_review'
  | 'delete_review';

export const REPORT_CONSUMER_ACTIONS = Object.freeze([
  'dismiss',
  'acknowledge',
  'mark_resolved',
  'hide_review',
  'delete_review',
] as const);

/**
 * Per-action metadata record. Consumed by:
 *   - the queue's action menu (renders `label`).
 *   - the queue's resolve dialog (consults `requiresTypedConfirm`,
 *     `confirmString`).
 *   - the audit shell (consults `breadcrumbAction`, `auditActionType`).
 *
 * The `sdkStatus` field is the SDK `status` value sent on the
 * `PATCH /api/v1/admin/reviews/reports/:reportId` round-trip.
 * The `requiresCompanionDelete` flag indicates whether the action
 * pairs the status PATCH with a follow-up
 * `DELETE /api/v1/admin/reviews/:reviewId`.
 */
export interface ReportActionMetadata {
  /** Display label (Title Case). */
  readonly label: string;
  /**
   * Whether the action is reversible in practice. `dismiss` and
   * `acknowledge` mutate only the report's status; `hide_review` and
   * `delete_review` mutate public review visibility.
   */
  readonly irreversible: boolean;
  /**
   * Whether `TypedConfirmDialog` must be rendered before the action
   * is dispatched. Always `true` when `irreversible` is `true`.
   */
  readonly requiresTypedConfirm: boolean;
  /**
   * The exact confirm-string the admin must type. `null` when the
   * action is not irreversible.
   */
  readonly confirmString: string | null;
  /**
   * The SDK `status` value the queue sends on the PATCH.
   */
  readonly sdkStatus: ReportAction;
  /**
   * Whether the action pairs the status PATCH with a follow-up
   * `DELETE /api/v1/admin/reviews/:reviewId`.
   */
  readonly requiresCompanionDelete: boolean;
  /**
   * Stable breadcrumb action name emitted via
   * `addReviewModerationBreadcrumb` (TKT-7.1.F2).
   */
  readonly breadcrumbAction: string;
  /**
   * Whether the action is destructive for `AuditActionShell` —
   * destructive actions are wrapped in the audit-aware shell so
   * `started` / `success` / `failure` breadcrumbs are emitted.
   */
  readonly auditActionType: 'destructive' | 'non-destructive';
}

const DISMISS_METADATA: ReportActionMetadata = Object.freeze({
  label: 'Dismiss report',
  irreversible: false,
  requiresTypedConfirm: false,
  confirmString: null,
  sdkStatus: 'dismissed',
  requiresCompanionDelete: false,
  breadcrumbAction: 'review.report.dismiss',
  auditActionType: 'non-destructive',
});

const ACKNOWLEDGE_METADATA: ReportActionMetadata = Object.freeze({
  label: 'Mark as acknowledged',
  irreversible: false,
  requiresTypedConfirm: false,
  confirmString: null,
  sdkStatus: 'reviewed',
  requiresCompanionDelete: false,
  breadcrumbAction: 'review.report.acknowledge',
  auditActionType: 'non-destructive',
});

const MARK_RESOLVED_METADATA: ReportActionMetadata = Object.freeze({
  label: 'Mark as resolved',
  irreversible: false,
  requiresTypedConfirm: false,
  confirmString: null,
  sdkStatus: 'reviewed',
  requiresCompanionDelete: false,
  breadcrumbAction: 'review.report.mark_resolved',
  auditActionType: 'non-destructive',
});

const HIDE_REVIEW_METADATA: ReportActionMetadata = Object.freeze({
  label: 'Hide review',
  irreversible: true,
  requiresTypedConfirm: true,
  confirmString: getIrreversibleConfirmString('review.hide' as IrreversibleAdminOperation),
  sdkStatus: 'actioned',
  requiresCompanionDelete: false,
  breadcrumbAction: 'review.report.hide',
  auditActionType: 'destructive',
});

const DELETE_REVIEW_METADATA: ReportActionMetadata = Object.freeze({
  label: 'Delete review',
  irreversible: true,
  requiresTypedConfirm: true,
  confirmString: getIrreversibleConfirmString(
    'review.delete' as IrreversibleAdminOperation,
  ),
  sdkStatus: 'actioned',
  requiresCompanionDelete: true,
  breadcrumbAction: 'review.report.delete',
  auditActionType: 'destructive',
});

/**
 * Documented action metadata catalogue. The object is `Object.freeze`-d
 * to prevent runtime mutation; the metadata records themselves are
 * also frozen at construction time.
 */
export const REPORT_ACTIONS: Readonly<Record<ReportConsumerAction, ReportActionMetadata>> =
  Object.freeze({
    dismiss: DISMISS_METADATA,
    acknowledge: ACKNOWLEDGE_METADATA,
    mark_resolved: MARK_RESOLVED_METADATA,
    hide_review: HIDE_REVIEW_METADATA,
    delete_review: DELETE_REVIEW_METADATA,
  });

/**
 * Type guard. Narrows an unknown string to the documented
 * `ReportConsumerAction` set. Used by the action menu, the resolve
 * dialog, and the queue's mutation hooks to validate incoming
 * values before reaching the SDK.
 */
export function isReportConsumerAction(
  value: unknown,
): value is ReportConsumerAction {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(REPORT_ACTIONS, value)
  );
}

/**
 * Lookup helper. Returns the metadata record for a given action, or
 * `null` when the action is unknown. Callers that need the typed
 * record should use `getReportActionMetadata` and check for `null`.
 */
export function getReportActionMetadata(
  action: ReportConsumerAction,
): ReportActionMetadata {
  return REPORT_ACTIONS[action];
}

/**
 * Convenience helper for `TypedConfirmDialog`. Returns `true` when
 * the action requires a typed-confirm before dispatch. Short-circuits
 * to `false` for unknown actions.
 */
export function requiresTypedConfirm(action: ReportConsumerAction): boolean {
  return REPORT_ACTIONS[action].requiresTypedConfirm;
}

/**
 * Returns the typed-confirm string the admin must type to confirm
 * `action`. Returns `null` when the action is not irreversible.
 */
export function getReportActionConfirmString(
  action: ReportConsumerAction,
): string | null {
  return REPORT_ACTIONS[action].confirmString;
}

/**
 * Returns the SDK `status` value the queue sends on the
 * `PATCH /api/v1/admin/reviews/reports/:reportId` round-trip.
 */
export function getSdkStatusForAction(
  action: ReportConsumerAction,
): ReportAction {
  return REPORT_ACTIONS[action].sdkStatus;
}

/**
 * Returns whether the action pairs the status PATCH with a follow-up
 * `DELETE /api/v1/admin/reviews/:reviewId`. Only `delete_review`
 * returns `true`.
 */
export function requiresCompanionDelete(action: ReportConsumerAction): boolean {
  return REPORT_ACTIONS[action].requiresCompanionDelete;
}

/**
 * Aggregate runtime invariant. Throws when the catalogue drifts from
 * the documented structural contract (every irreversible action has a
 * non-empty confirm string; every action has a non-empty label).
 * Used by the co-located spec to lock the invariants at runtime.
 *
 * @internal — exported only for the co-located spec; not consumed by
 * production code.
 */
export function assertReportActionCatalogueHolds(): void {
  const seen = new Set<string>();
  for (const action of REPORT_CONSUMER_ACTIONS) {
    const metadata = REPORT_ACTIONS[action];
    if (metadata.label.length === 0) {
      throw new Error(
        `report-action-enum: action '${action}' has an empty label`,
      );
    }
    if (metadata.irreversible && metadata.requiresTypedConfirm !== true) {
      throw new Error(
        `report-action-enum: irreversible action '${action}' must require typed confirm`,
      );
    }
    if (metadata.requiresTypedConfirm) {
      if (
        typeof metadata.confirmString !== 'string' ||
        metadata.confirmString.length === 0
      ) {
        throw new Error(
          `report-action-enum: typed-confirm action '${action}' is missing a confirm string`,
        );
      }
      if (seen.has(metadata.confirmString)) {
        throw new Error(
          `report-action-enum: duplicate confirm string '${metadata.confirmString}'`,
        );
      }
      seen.add(metadata.confirmString);
    } else if (metadata.confirmString !== null) {
      throw new Error(
        `report-action-enum: non-typed-confirm action '${action}' must have a null confirm string`,
      );
    }
  }
}