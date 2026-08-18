'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/shared/utils/merge-class-names';

import type {
CommentReportDto,
CommentReportState,
} from '@/features/admin/comment-moderation/admin-comment-report-types';
import { CommentReportActionMenu } from '@/features/admin/comment-moderation/components/CommentReportActionMenu';
import type { CommentReportConsumerAction } from '@/features/admin/comment-moderation/action-enum';

export type CommentRowStatus = 'pending' | 'resolved';

const STATUS_PILL_VIEW: Readonly<
Record<CommentReportState, { label: string; pill: CommentRowStatus; tone: 'slate' | 'emerald' }>
> = Object.freeze({
open:      { label: 'Pending',  pill: 'pending',  tone: 'slate' },
reviewed:  { label: 'Reviewed', pill: 'resolved', tone: 'emerald' },
dismissed: { label: 'Dismissed', pill: 'resolved', tone: 'emerald' },
actioned:  { label: 'Actioned', pill: 'resolved', tone: 'emerald' },
});

const REASON_PREVIEW_LINE_COUNT = 1;

function formatRowTimestamp(value: string | null | undefined): string {
if (typeof value !== 'string' || value.length === 0) return '';
const parsed = new Date(value);
if (Number.isNaN(parsed.getTime())) return value;

return new Intl.DateTimeFormat(undefined, {
year: 'numeric',
month: 'short',
day: '2-digit',
hour: '2-digit',
minute: '2-digit',
  }).format(parsed);
}

export interface CommentReportItemProps {

report: CommentReportDto;

commentAuthorId: string | null;

onSelect: (report: CommentReportDto) => void;

onAction: (action: CommentReportConsumerAction, report: CommentReportDto) => void;

selected?: boolean;

className?: string;
}

export const CommentReportItem = memo(function CommentReportItem({
report,
commentAuthorId,
onSelect,
onAction,
selected = false,
className,
}: CommentReportItemProps): React.ReactElement {
const statusView = useMemo(
() => STATUS_PILL_VIEW[report.status],
[report.status],
  );

const timestampValue = useMemo(() => {
return statusView.pill === 'resolved' ? report.updatedAt : report.createdAt;
  }, [statusView.pill, report.updatedAt, report.createdAt]);

const timestampLabel = useMemo(() => {
const formatted = formatRowTimestamp(timestampValue);
return formatted.length === 0 ? '' : formatted;
  }, [timestampValue]);

const reasonText = typeof report.reason === 'string' ? report.reason : '';
const isLongReason = reasonText.length > 40;

const [reasonExpanded, setReasonExpanded] = useState(false);

const handleRowClick = useCallback(() => {
onSelect(report);
  }, [report, onSelect]);

const handleRowKeyDown = useCallback(
(event: React.KeyboardEvent<HTMLDivElement>) => {
if (event.key === 'Enter' || event.key === ' ') {
event.preventDefault();
onSelect(report);
      }
    },
[report, onSelect],
  );

const handleAction = useCallback(
(action: CommentReportConsumerAction) => {
onAction(action, report);
    },
[report, onAction],
  );

const stopPropagation = useCallback(
(event: React.MouseEvent | React.KeyboardEvent) => {
event.stopPropagation();
    },
[],
  );

const handleReasonToggle = useCallback(
(event: React.MouseEvent | React.KeyboardEvent) => {
event.stopPropagation();
setReasonExpanded((current) => !current);
    },
[],
  );

return (
<div
role="button"
tabIndex={0}
aria-selected={selected}
data-testid={`comment-report-row-${report.reportId}`}
data-state={report.status}
onClick={handleRowClick}
onKeyDown={handleRowKeyDown}
className={cn(
'flex w-full cursor-pointer items-center gap-4 rounded-md border border-border bg-background px-4 py-3 text-left transition-colors',
'border-border hover:border-input hover:bg-muted',
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : '',
className ?? '',
      )}
    >
{/* Reason block */}
<div className="flex flex-1 flex-col gap-1 overflow-hidden">
<div className="flex items-center gap-2">
<span
className="truncate font-medium text-foreground"
data-testid={`comment-report-row-reporter-${report.reportId}`}
          >
Reporter {report.reporterId}
</span>
<span className="text-xs text-muted-foreground">reported</span>
<span
className="truncate font-mono text-sm text-muted-foreground"
data-testid={`comment-report-row-comment-${report.reportId}`}
          >
{report.commentId}
</span>
</div>

<div
className={cn(
'text-sm text-muted-foreground',
!reasonExpanded && isLongReason
? `line-clamp-${REASON_PREVIEW_LINE_COUNT}`
: '',
          )}
data-testid={`comment-report-row-reason-${report.reportId}`}
        >
<span className="capitalize">{reasonText.replace(/_/g, ' ')}</span>
</div>

{isLongReason ? (
<button
type="button"
onClick={handleReasonToggle}
className="self-start text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
data-testid={`comment-report-row-reason-toggle-${report.reportId}`}
aria-expanded={reasonExpanded}
          >
{reasonExpanded ? 'Show less' : 'Show more'}
</button>
        ) : null}
</div>

{/* Status pill */}
<Badge
variant={statusView.tone === 'slate' ? 'secondary' : 'default'}
data-testid={`comment-report-row-pill-${report.reportId}`}
data-pill={statusView.pill}
className={cn(
'shrink-0 capitalize',
statusView.tone === 'emerald'
? 'border-transparent bg-emerald-100 text-emerald-800'
: '',
        )}
      >
{statusView.label}
</Badge>

{/* Timestamp */}
<span
className="hidden shrink-0 text-xs text-muted-foreground md:inline"
data-testid={`comment-report-row-timestamp-${report.reportId}`}
      >
{timestampLabel}
</span>

{/* Action menu (click-isolated) */}
<div
onClick={stopPropagation}
onKeyDown={stopPropagation}
data-testid={`comment-report-row-actions-${report.reportId}`}
      >
<CommentReportActionMenu
report={report}
commentAuthorId={commentAuthorId}
onAction={handleAction}
        />
</div>
</div>
  );
});