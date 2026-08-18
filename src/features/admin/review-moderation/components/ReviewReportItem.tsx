'use client';

import { memo, useCallback, useMemo } from 'react';
import { Star } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/shared/utils/merge-class-names';

import type { AdminReportDto, ReportState } from '@/features/admin/review-moderation/admin-report-types';
import { ReviewReportActionMenu } from '@/features/admin/review-moderation/components/ReviewReportActionMenu';
import type { ReportConsumerAction } from '@/features/admin/review-moderation/action-enum';

export type ReportRowStatus = 'pending' | 'resolved';

const STATUS_PILL_VIEW: Readonly<
Record<ReportState, { label: string; pill: ReportRowStatus; tone: 'slate' | 'emerald' }>
> = Object.freeze({
open:      { label: 'Pending',  pill: 'pending',  tone: 'slate' },
reviewed:  { label: 'Reviewed', pill: 'resolved', tone: 'emerald' },
dismissed: { label: 'Dismissed', pill: 'resolved', tone: 'emerald' },
actioned:  { label: 'Actioned', pill: 'resolved', tone: 'emerald' },
});

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

export interface ReviewReportItemProps {

report: AdminReportDto;

onSelect: (report: AdminReportDto) => void;

onAction: (action: ReportConsumerAction, report: AdminReportDto) => void;

selected?: boolean;

className?: string;
}

export const ReviewReportItem = memo(function ReviewReportItem({
report,
onSelect,
onAction,
selected = false,
className,
}: ReviewReportItemProps): React.ReactElement {
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
(action: ReportConsumerAction) => {
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

return (
<div
role="button"
tabIndex={0}
aria-selected={selected}
data-testid={`review-report-row-${report.reportId}`}
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
data-testid={`review-report-row-reporter-${report.reportId}`}
          >
{report.reviewerUsername}
</span>
<span className="text-xs text-muted-foreground">reported</span>
<span
className="truncate text-sm text-muted-foreground"
data-testid={`review-report-row-quiz-${report.reportId}`}
          >
{report.quizTitle}
</span>
</div>

<div
className="flex items-center gap-2 text-sm text-muted-foreground"
data-testid={`review-report-row-rating-${report.reportId}`}
        >
<span className="inline-flex items-center gap-0.5">
{Array.from({ length: 5 }, (_, index) => (
<Star
key={index}
aria-hidden="true"
className={cn(
'h-3.5 w-3.5',
index < report.rating
? 'fill-amber-400 stroke-amber-500'
: 'fill-transparent stroke-slate-300',
                )}
              />
            ))}
</span>
<span>{report.rating}/5</span>
<span aria-hidden="true">·</span>
<span
className="capitalize"
data-testid={`review-report-row-reason-${report.reportId}`}
          >
{report.reason.replace(/_/g, ' ')}
</span>
</div>
</div>

{/* Status pill */}
<Badge
variant={statusView.tone === 'slate' ? 'secondary' : 'default'}
data-testid={`review-report-row-pill-${report.reportId}`}
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
data-testid={`review-report-row-timestamp-${report.reportId}`}
      >
{timestampLabel}
</span>

{/* Action menu (click-isolated) */}
<div
onClick={stopPropagation}
onKeyDown={stopPropagation}
data-testid={`review-report-row-actions-${report.reportId}`}
      >
<ReviewReportActionMenu report={report} onAction={handleAction} />
</div>
</div>
  );
});