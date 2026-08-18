

import type { CommentReportAction } from './admin-comment-report-types';

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

export interface CommentReportActionMetadata {

readonly label: string;

readonly reversible: boolean;

readonly requiresTypedConfirm: boolean;

readonly confirmString: string | null;

readonly sdkStatus: CommentReportAction;

readonly requiresCompanionHide: boolean;

readonly breadcrumbAction: string;

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

export const COMMENT_REPORT_ACTIONS: Readonly<
Record<CommentReportConsumerAction, CommentReportActionMetadata>
> = Object.freeze({
dismiss: DISMISS_METADATA,
acknowledge: ACKNOWLEDGE_METADATA,
mark_resolved: MARK_RESOLVED_METADATA,
hide_comment: HIDE_COMMENT_METADATA,
});

export function isCommentReportConsumerAction(
value: unknown,
): value is CommentReportConsumerAction {
return (
typeof value === 'string' &&
Object.prototype.hasOwnProperty.call(COMMENT_REPORT_ACTIONS, value)
  );
}

export function getCommentReportActionMetadata(
action: CommentReportConsumerAction,
): CommentReportActionMetadata {
return COMMENT_REPORT_ACTIONS[action];
}

export function requiresTypedConfirm(
action: CommentReportConsumerAction,
): boolean {
return COMMENT_REPORT_ACTIONS[action].requiresTypedConfirm;
}

export function getCommentReportActionConfirmString(
action: CommentReportConsumerAction,
): string | null {
return COMMENT_REPORT_ACTIONS[action].confirmString;
}

export function getSdkStatusForCommentReportAction(
action: CommentReportConsumerAction,
): CommentReportAction {
return COMMENT_REPORT_ACTIONS[action].sdkStatus;
}

export function requiresCompanionHide(
action: CommentReportConsumerAction,
): boolean {
return COMMENT_REPORT_ACTIONS[action].requiresCompanionHide;
}

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