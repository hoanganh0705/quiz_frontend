'use client';

import { useCallback, useMemo, useState } from 'react';

import {
AlertDialog,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import { AuditActionShell } from '@/features/admin/components/AuditActionShell';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import { useResolveCommentReport } from '../hooks/useResolveCommentReport';
import {
COMMENT_REPORT_ACTIONS,
type CommentReportConsumerAction,
} from '../action-enum';
import type { CommentReportDto } from '../admin-comment-report-types';
import type { ApiError } from '@/lib/api/core/ApiError';

export interface CommentReportActionConfirmDialogProps {

open: boolean;

report: CommentReportDto | null;

action: CommentReportConsumerAction | null;

onClose: () => void;
}

interface OutcomeNoticeProps {
outcome: 'forbidden' | 'not-found' | 'already-resolved' | 'reverted' | 'success' | null;
error: ApiError | null;
reportId: string;
}

function OutcomeNotice({
outcome,
error,
reportId,
}: OutcomeNoticeProps): React.ReactElement | null {
if (outcome === null || outcome === 'success') return null;

let title: string;
let description: string;
if (outcome === 'forbidden') {
title = 'Permission denied';
description =
'Your account no longer has permission to perform this action. The status was not changed.';
  } else if (outcome === 'not-found') {
title = 'Report no longer exists';
description =
'Another admin already resolved this report, or the comment was deleted. The queue has been refreshed.';
  } else if (outcome === 'already-resolved') {
title = 'Report already handled';
description =
'Another admin already resolved this report. The queue has been refreshed.';
  } else {
title = 'Could not save the action';
description =
'The resolve request failed. The status was not changed. Copy the request id and retry.';
  }

return (
<div
role="alert"
className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900"
data-testid={`comment-report-confirm-outcome-${reportId}`}
    >
<p className="font-semibold">{title}</p>
<p className="mt-1">{description}</p>
<RequestIdBanner error={error} />
</div>
  );
}

export function CommentReportActionConfirmDialog({
open,
report,
action,
onClose,
}: CommentReportActionConfirmDialogProps): React.ReactElement | null {
const {
resolve,
isPending,
error,
lastOutcome,
  } = useResolveCommentReport();

const isActive = open && report !== null && action !== null;
const metadata = action !== null ? COMMENT_REPORT_ACTIONS[action] : null;

const [typedInput, setTypedInput] = useState('');
const matchesTypedConfirm =
metadata === null || !metadata.requiresTypedConfirm
? true
: metadata.confirmString !== null &&
typedInput === metadata.confirmString;

const beforeSnapshot = useMemo(() => {
if (report === null) return null;
return {
reportId: report.reportId,
commentId: report.commentId,
reason: report.reason,
status: report.status,
    };
  }, [report]);

const mutate = useCallback(async () => {
if (report === null || action === null) {
throw new Error('Cannot resolve without a report and an action.');
    }
return resolve(report.reportId, action);
  }, [report, action, resolve]);

const handleShellComplete = useCallback(
(result: unknown) => {
if (result !== undefined && result !== null) {
onClose();
      }
    },
[onClose],
  );

const handleOpenChange = useCallback(
(next: boolean) => {
if (!next) onClose();
    },
[onClose],
  );

if (!isActive || report === null || action === null || metadata === null) {
return null;
  }

const outcomeKind = (lastOutcome?.kind ?? null) as
| 'forbidden'
    | 'not-found'
    | 'already-resolved'
    | 'reverted'
    | 'success'
    | null;
const outcomeError = lastOutcome?.cause ?? error ?? null;

const hasFailure =
outcomeKind === 'forbidden' ||
outcomeKind === 'not-found' ||
outcomeKind === 'already-resolved' ||
outcomeKind === 'reverted';
const confirmDisabled = isPending || !matchesTypedConfirm;

return (
<AlertDialog open={open} onOpenChange={handleOpenChange}>
<AlertDialogContent data-testid={`comment-report-confirm-dialog-${report.reportId}`}>
<AlertDialogHeader>
<AlertDialogTitle>{metadata.label}</AlertDialogTitle>
<AlertDialogDescription>
{metadata.requiresCompanionHide
? 'This will hide the reported comment and mark the report as resolved. The comment can be restored later.'
: `This will change the report's status to ${metadata.sdkStatus}.`}
</AlertDialogDescription>
</AlertDialogHeader>

<div
className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground"
data-testid={`comment-report-confirm-summary-${report.reportId}`}
        >
<p className="font-semibold">Offending comment</p>
<p className="mt-1">
Comment id:{' '}
<span className="font-mono">{report.commentId}</span>
</p>
<p className="mt-2 text-slate-700">
Reason: <span className="font-medium">{report.reason}</span>
</p>
</div>

{metadata.requiresTypedConfirm && metadata.confirmString !== null ? (
<div
className="space-y-2"
data-testid={`comment-report-confirm-typed-${report.reportId}`}
          >
<Label htmlFor={`typed-confirm-${report.reportId}`}>
Type <span className="font-mono">{metadata.confirmString}</span> to
              confirm
            </Label>
<Input
id={`typed-confirm-${report.reportId}`}
value={typedInput}
onChange={(event) => setTypedInput(event.target.value)}
placeholder={metadata.confirmString}
autoComplete="off"
autoCorrect="off"
spellCheck={false}
data-testid={`comment-report-confirm-typed-input-${report.reportId}`}
            />
</div>
        ) : null}

{hasFailure && outcomeError !== null ? (
<OutcomeNotice
outcome={outcomeKind}
error={outcomeError}
reportId={report.reportId}
          />
        ) : null}

<AlertDialogFooter>
<AlertDialogCancel disabled={isPending} onClick={onClose}>
Cancel
          </AlertDialogCancel>
<AuditActionShell
action={metadata.breadcrumbAction}
before={beforeSnapshot}
redactFields={['reporterId', 'details']}
mutate={mutate}
onBreadcrumb={handleShellComplete}
          >
{(shell) => (
<Button
type="button"
disabled={confirmDisabled || shell.isPending}
onClick={() => {

mutate().catch(() => undefined);
                }}
data-testid={`comment-report-confirm-action-${report.reportId}`}
              >
{isPending || shell.isPending ? 'Working…' : metadata.label}
</Button>
            )}
</AuditActionShell>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
  );
}
