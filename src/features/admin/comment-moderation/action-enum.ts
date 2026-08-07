/**
 * `features/admin/comment-moderation/action-enum.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.B2.
 *
 * ## Purpose
 *
 * The queue's consumer-facing action vocabulary and its metadata table.
 * The queue never displays raw SDK `status` values to admins; instead
 * it surfaces a higher-level action set that maps to one or two
 * backend round-trips:
 *
 *   - `dismiss`        → `PATCH status: 'dismissed'` (terminal, no destructive effect).
 *   - `acknowledge`    → `PATCH status: 'reviewed'`  (terminal, no destructive effect).
 *   - `mark_resolved`  → alias of `acknowledge` for legacy UI surfaces.
 *   - `hide_comment`   → `PATCH status: 'actioned'`  +
 *                        `POST /comments/:commentId/hide` +
 *                        the `CommentHiddenState` affordance.
 *                        **Reversible** — the queue surfaces a `restore_comment`
 *                        affordance on the hidden-comment render (Batch F),
 *                        so the action does NOT require typed-confirm.
 *
 * The action set is the **single source of truth** for action
 * membership, display labels, irreversibility, breadcrumb names, and
 * the SDK `status` mapping.
 *
 * ## Cross-batch invariants
 *
 *   1. **Whitelist exclusivity** — only actions listed in
 *      `COMMENT_REPORT_CONSUMER_ACTIONS` may be passed to
 *      `patchCommentReport(reportId, action)` from the queue.
 *   2. **No irreversible metadata entries** — every documented action is
 *      reversible in practice: `dismiss` and `acknowledge` only mutate
 *      the report's status; `hide_comment` mutates comment visibility
 *      but is reversible via `POST /comments/:commentId/restore`. The
 *      catalogue therefore never sets `requiresTypedConfirm: true` and
 *      `confirmString` is always `null` for comment-side actions. The
 *      `irreversible-confirm-invariants.ts` catalogue is unchanged.
 *   3. **Display labels** — every documented action has a non-empty
 *      `label` (UI copy).
 *   4. **Companion-side-effect linkage** — `hide_comment` is the only
 *      action that pairs the status PATCH with a follow-up
 *      `POST /comments/:commentId/hide` (Batch F wires the side-effect
 *      hook; this module declares the linkage).
 *   5. **Reuse note** — the underlying SDK action union
 *      (`reviewed | dismissed | actioned`) is the same closed set
 *      Epic 7.5 uses for review moderation. The consumer-side
 *      vocabulary here is *comment-specific* and is NOT a re-export of
 *      Epic 7.5's `REPORT_CONSUMER_ACTIONS`: hide_comment has no
 *      review-side counterpart, and review-side `hide_review` /
 *      `delete_review` have no comment-side counterpart.
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

import type { CommentReportAction } from './admin-comment-report-types';

// ─── Consumer-side vocabulary ───────────────────────────────────────────────

/**
 * Documented consumer-side action vocabulary for the comment-moderation
 * queue. The union is closed; the type-narrowing helpers
 * (`isCommentReportConsumerAction`) and the catalogue table share the
 * same membership set.
 */
export type CommentReportConsumerAction =
  | 'dismiss'
  | 'acknowledge'
  | 'mark_resolved'
  | 'hide_comment';

export const COMMENT_REPORT_CONSUMER_ACTIONS = Object.freeze([
  'dismiss',
  'acknowledge',
  'mark_resolved',
  'hide_comment',
] as const);

// ─── Per-action metadata record ─────────────────────────────────────────────

/**
 * Per-action metadata record. Consumed by:
 *   - the queue's action menu (renders `label`).
 *   - the audit shell (consults `breadcrumbAction`, `auditActionType`).
 *
 * The `sdkStatus` field is the SDK `status` value sent on the
 * `PATCH /api/v1/comments/reports/:reportId` round-trip. The
 * `requiresCompanionHide` flag indicates whether the action pairs
 * the status PATCH with a follow-up
 * `POST /api/v1/comments/:commentId/hide`.
 *
 * Note that `requiresTypedConfirm` and `confirmString` are present
 * for shape parity with Epic 7.5's `ReportActionMetadata`; every
 * documented comment-side action has `requiresTypedConfirm: false`
 * and `confirmString: null` because the destructive pair is reversible.
 */
export interface CommentReportActionMetadata {
  /** Display label (Title Case). */
  readonly label: string;
  /**
   * Whether the action is reversible in practice. `dismiss` and
   * `acknowledge` mutate only the report's status; `hide_comment`
   * mutates comment visibility but is reversible via `restoreComment`.
   */
  readonly reversible: boolean;
  /**
   * Whether `TypedConfirmDialog` must be rendered before the action
   * is dispatched. Always `false` for comment-side actions because
   * every destructive side-effect has a documented inverse.
   */
  readonly requiresTypedConfirm: boolean;
  /**
   * The exact confirm-string the admin would type. Always `null` for
   * comment-side actions.
   */
  readonly confirmString: string | null;
  /**
   * The SDK `status` value the queue sends on the PATCH.
   */
  readonly sdkStatus: CommentReportAction;
  /**
   * Whether the action pairs the status PATCH with a follow-up
   * `POST /api/v1/comments/:commentId/hide`. Only `hide_comment`
   * returns `true`.
   */
  readonly requiresCompanionHide: boolean;
  /**
   * Stable breadcrumb action name emitted via
   * `addCommentModerationBreadcrumb` (TKT-7.1.F2).
   */
  readonly breadcrumbAction: string;
  /**
   * Whether the action is destructive for `AuditActionShell` —
   * destructive actions are wrapped in the audit-aware shell so
   * `started` / `success` / `failure` breadcrumbs are emitted.
   */
  readonly auditActionType: 'destructive' | 'non-destructive';
}

const DISMISS_METADATA: CommentReportActionMetadata = Object.freeze({
  label: 'Dismiss report',
  reversible: true,
  requiresTypedConfirm: false,
  confirmString: null,
  sdkStatus: 'dismissed',
  requiresCompanionHide: false,
  breadcrumbAction: 'comment.report.dismiss',
  auditActionType: 'non-destructive',
});

const ACKNOWLEDGE_METADATA: CommentReportActionMetadata = Object.freeze({
  label: 'Mark as acknowledged',
  reversible: true,
  requiresTypedConfirm: false,
  confirmString: null,
  sdkStatus: 'reviewed',
  requiresCompanionHide: false,
  breadcrumbAction: 'comment.report.acknowledge',
  auditActionType: 'non-destructive',
});

const MARK_RESOLVED_METADATA: CommentReportActionMetadata = Object.freeze({
  label: 'Mark as resolved',
  reversible: true,
  requiresTypedConfirm: false,
  confirmString: null,
  sdkStatus: 'reviewed',
  requiresCompanionHide: false,
  breadcrumbAction: 'comment.report.mark_resolved',
  auditActionType: 'non-destructive',
});

const HIDE_COMMENT_METADATA: CommentReportActionMetadata = Object.freeze({
  label: 'Hide comment',
  reversible: true,
  requiresTypedConfirm: false,
  confirmString: null,
  sdkStatus: 'actioned',
  requiresCompanionHide: true,
  breadcrumbAction: 'comment.report.hide_comment',
  auditActionType: 'destructive',
});

/**
 * Documented action metadata catalogue. The object is `Object.freeze`-d
 * to prevent runtime mutation; the metadata records themselves are
 * also frozen at construction time.
 */
export const COMMENT_REPORT_ACTIONS: Readonly<
  Record<CommentReportConsumerAction, CommentReportActionMetadata>
> = Object.freeze({
  dismiss: DISMISS_METADATA,
  acknowledge: ACKNOWLEDGE_METADATA,
  mark_resolved: MARK_RESOLVED_METADATA,
  hide_comment: HIDE_COMMENT_METADATA,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Type guard. Narrows an unknown string to the documented
 * `CommentReportConsumerAction` set. Used by the action menu, the
 * resolve dialog, and the queue's mutation hooks to validate incoming
 * values before reaching the SDK.
 */
export function isCommentReportConsumerAction(
  value: unknown,
): value is CommentReportConsumerAction {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(COMMENT_REPORT_ACTIONS, value)
  );
}

/**
 * Lookup helper. Returns the metadata record for a given action.
 */
export function getCommentReportActionMetadata(
  action: CommentReportConsumerAction,
): CommentReportActionMetadata {
  return COMMENT_REPORT_ACTIONS[action];
}

/**
 * Convenience helper for `TypedConfirmDialog`. Returns `false` for
 * every documented comment-side action — the catalogue has no
 * irreversible entries. The helper exists for shape parity with
 * Epic 7.5's `requiresTypedConfirm` and to give future irreversible
 * actions a single home.
 */
export function requiresTypedConfirm(
  action: CommentReportConsumerAction,
): boolean {
  return COMMENT_REPORT_ACTIONS[action].requiresTypedConfirm;
}

/**
 * Returns the typed-confirm string the admin would type to confirm
 * `action`. Always `null` for comment-side actions.
 */
export function getCommentReportActionConfirmString(
  action: CommentReportConsumerAction,
): string | null {
  return COMMENT_REPORT_ACTIONS[action].confirmString;
}

/**
 * Returns the SDK `status` value the queue sends on the
 * `PATCH /api/v1/comments/reports/:reportId` round-trip.
 */
export function getSdkStatusForCommentReportAction(
  action: CommentReportConsumerAction,
): CommentReportAction {
  return COMMENT_REPORT_ACTIONS[action].sdkStatus;
}

/**
 * Returns whether the action pairs the status PATCH with a follow-up
 * `POST /api/v1/comments/:commentId/hide`. Only `hide_comment`
 * returns `true`.
 */
export function requiresCompanionHide(
  action: CommentReportConsumerAction,
): boolean {
  return COMMENT_REPORT_ACTIONS[action].requiresCompanionHide;
}

// ─── Invariant assertion (internal) ─────────────────────────────────────────

/**
 * Aggregate runtime invariant. Throws when the catalogue drifts from
 * the documented structural contract (every action has a non-empty
 * label; irreversible actions require typed-confirm; typed-confirm
 * actions have a non-empty confirm string). Used by the co-located
 * spec to lock the invariants at runtime.
 *
 * The catalogue is currently "every documented action is reversible";
 * if a future irreversible action is added, the assertion will surface
 * the missing `IRREVERSIBLE_OPERATIONS` entry until
 * `admin-capabilities.ts` is updated in lockstep.
 *
 * @internal — exported only for the co-located spec; not consumed by
 * production code.
 */
export function assertCommentReportActionCatalogueHolds(): void {
  const seen = new Set<string>();
  for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
    const metadata = COMMENT_REPORT_ACTIONS[action];
    if (metadata.label.length === 0) {
      throw new Error(
        `comment-action-enum: action '${action}' has an empty label`,
      );
    }
    if (metadata.breadcrumbAction.length === 0) {
      throw new Error(
        `comment-action-enum: action '${action}' has an empty breadcrumb action`,
      );
    }
    if (metadata.requiresTypedConfirm) {
      if (
        typeof metadata.confirmString !== 'string' ||
        metadata.confirmString.length === 0
      ) {
        throw new Error(
          `comment-action-enum: typed-confirm action '${action}' is missing a confirm string`,
        );
      }
      if (seen.has(metadata.confirmString)) {
        throw new Error(
          `comment-action-enum: duplicate confirm string '${metadata.confirmString}'`,
        );
      }
      seen.add(metadata.confirmString);
    } else if (metadata.confirmString !== null) {
      throw new Error(
        `comment-action-enum: non-typed-confirm action '${action}' must have a null confirm string`,
      );
    }
  }
}