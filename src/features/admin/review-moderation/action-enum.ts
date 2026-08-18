

import type { ReportAction } from './admin-report-types';
import type { IrreversibleAdminOperation } from '../admin-capabilities';
import { getIrreversibleConfirmString } from '../admin-capabilities';

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

export interface ReportActionMetadata {

readonly label: string;

readonly irreversible: boolean;

readonly requiresTypedConfirm: boolean;

readonly confirmString: string | null;

readonly sdkStatus: ReportAction;

readonly requiresCompanionDelete: boolean;

readonly breadcrumbAction: string;

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

export const REPORT_ACTIONS: Readonly<Record<ReportConsumerAction, ReportActionMetadata>> =
Object.freeze({
dismiss: DISMISS_METADATA,
acknowledge: ACKNOWLEDGE_METADATA,
mark_resolved: MARK_RESOLVED_METADATA,
hide_review: HIDE_REVIEW_METADATA,
delete_review: DELETE_REVIEW_METADATA,
  });

export function isReportConsumerAction(
value: unknown,
): value is ReportConsumerAction {
return (
typeof value === 'string' &&
Object.prototype.hasOwnProperty.call(REPORT_ACTIONS, value)
  );
}

export function getReportActionMetadata(
action: ReportConsumerAction,
): ReportActionMetadata {
return REPORT_ACTIONS[action];
}

export function requiresTypedConfirm(action: ReportConsumerAction): boolean {
return REPORT_ACTIONS[action].requiresTypedConfirm;
}

export function getReportActionConfirmString(
action: ReportConsumerAction,
): string | null {
return REPORT_ACTIONS[action].confirmString;
}

export function getSdkStatusForAction(
action: ReportConsumerAction,
): ReportAction {
return REPORT_ACTIONS[action].sdkStatus;
}

export function requiresCompanionDelete(action: ReportConsumerAction): boolean {
return REPORT_ACTIONS[action].requiresCompanionDelete;
}

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