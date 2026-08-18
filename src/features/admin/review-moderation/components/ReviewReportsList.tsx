'use client';

import {
useCallback,
useEffect,
useMemo,
useRef,
useState,
type UIEvent,
} from 'react';
import { Inbox, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import {
useReviewReports,
type ReviewReportsShow,
} from '@/features/admin/review-moderation/hooks/useReviewReports';
import type { ReportConsumerAction } from '@/features/admin/review-moderation/action-enum';
import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';

import { ReviewReportItem } from '@/features/admin/review-moderation/components/ReviewReportItem';
import { ReviewReportDetailPanel } from '@/features/admin/review-moderation/components/ReviewReportDetailPanel';
import { ReviewReportActionConfirmDialog } from '@/features/admin/review-moderation/components/ReviewReportActionConfirmDialog';
import { ReviewReportSkeleton } from '@/features/admin/review-moderation/components/ReviewReportSkeleton';
import { ReviewReportEmptyState } from '@/features/admin/review-moderation/components/ReviewReportEmptyState';
import { ReviewReportErrorState } from '@/features/admin/review-moderation/components/ReviewReportErrorState';

interface ScrollSnapshot {
top: number;
height: number;
}

function useScrollPreserveBoundary(
scrollRef: React.RefObject<HTMLElement | null>,
dependencies: ReadonlyArray<unknown>,
): void {
const captured = useRef<ScrollSnapshot | null>(null);

useEffect(() => {
const node = scrollRef.current;
if (node === null) return;
const target = captured.current;
if (target !== null) {

node.scrollTop = target.top;
captured.current = null;
    }

queueMicrotask(() => {
captured.current = {
top: node.scrollTop,
height: node.scrollHeight,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

const SHOW_TOGGLE_OPTIONS: ReadonlyArray<{
value: ReviewReportsShow;
label: string;
}> = Object.freeze([
{ value: 'pending', label: 'Pending' },
{ value: 'resolved', label: 'Resolved' },
] as const);

export interface ReviewReportsListProps {

initialShow?: ReviewReportsShow;

enabled?: boolean;

className?: string;
}

export function ReviewReportsList({
initialShow: _initialShow,
enabled = true,
className,
}: ReviewReportsListProps): React.ReactElement {
const {
items,
isLoading,
isLoadingMore,
hasMore,
loadMore,
error,
refresh,
show,
setShow,
  } = useReviewReports({ enabled });

const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
const [pendingAction, setPendingAction] = useState<ReportConsumerAction | null>(
null,
  );

const selectedReport = useMemo<AdminReportDto | null>(() => {
if (selectedReportId === null) return null;
return items.find((item) => item.reportId === selectedReportId) ?? null;
  }, [items, selectedReportId]);

const scrollerRef = useRef<HTMLDivElement | null>(null);

useScrollPreserveBoundary(scrollerRef, [items.length]);

const handleSelect = useCallback(
(report: AdminReportDto) => {
setSelectedReportId((current) =>
current === report.reportId ? null : report.reportId,
      );
    },
[],
  );

const handleAction = useCallback(
(action: ReportConsumerAction, report: AdminReportDto) => {
setSelectedReportId(report.reportId);
setPendingAction(action);
    },
[],
  );

const handleDialogClose = useCallback(() => {
setPendingAction(null);
  }, []);

const handleShowChange = useCallback(
(next: ReviewReportsShow) => {
setShow(next);
    },
[setShow],
  );

useEffect(() => {
setSelectedReportId(null);
setPendingAction(null);
  }, [show]);

const displayReport = selectedReport;

const handleScroll = useCallback((_event: UIEvent<HTMLDivElement>) => {
    // The scroll position is captured by `useScrollPreserveBoundary`
    // via a microtask; this handler is a placeholder for future
    // virtualisation hooks (e.g. infinite-scroll triggers).
  }, []);

const renderRows = () => {
if (isLoading) {
return <ReviewReportSkeleton rows={3} />;
    }

if (error !== null) {
return (
<ReviewReportErrorState
error={error}
onRetry={() => {
void refresh();
          }}
        />
      );
    }

if (items.length === 0) {
return (
<ReviewReportEmptyState
filter={show}
onShowResolved={
show === 'pending'
? () => handleShowChange('resolved')
: undefined
          }
        />
      );
    }

return (
<div
role="list"
aria-label={`Review reports (${show})`}
className="flex flex-col gap-2"
data-testid={`review-report-list-${show}`}
      >
{items.map((report) => (
<ReviewReportItem
key={report.reportId}
report={report}
onSelect={handleSelect}
onAction={handleAction}
selected={selectedReportId === report.reportId}
          />
        ))}
</div>
    );
  };

return (
<section
data-testid="review-reports-list"
className={cn('flex flex-col gap-4', className ?? '')}
    >
<header
className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
data-testid="review-reports-list-header"
      >
<div role="tablist" aria-label="Filter review reports" className="inline-flex rounded-md border border-border bg-background p-0.5">
{SHOW_TOGGLE_OPTIONS.map((option) => {
const isActive = option.value === show;
return (
<button
key={option.value}
role="tab"
type="button"
aria-selected={isActive}
aria-controls={`review-reports-list-${option.value}`}
onClick={() => handleShowChange(option.value)}
data-testid={`review-reports-list-tab-${option.value}`}
className={cn(
'rounded px-3 py-1.5 text-sm font-medium transition-colors',
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
isActive
? 'bg-primary text-primary-foreground'
: 'text-muted-foreground hover:bg-slate-100',
                )}
              >
{option.label}
</button>
            );
          })}
</div>
<p
className="text-xs text-muted-foreground"
data-testid="review-reports-list-count"
        >
{items.length} report{items.length === 1 ? '' : 's'}
</p>
</header>

<div
ref={scrollerRef}
onScroll={handleScroll}
data-testid="review-reports-list-scroller"
className="relative max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background p-3"
      >
{renderRows()}

{hasMore && !isLoading && error === null ? (
<div
className="mt-3 flex items-center justify-center"
data-testid="review-reports-list-load-more"
          >
<Button
type="button"
variant="outline"
size="sm"
onClick={() => {
void loadMore();
              }}
disabled={isLoadingMore}
data-testid="review-reports-list-load-more-button"
            >
{isLoadingMore ? (
<>
<Loader2
className="mr-2 h-4 w-4 animate-spin"
aria-hidden="true"
                  />
Loading…
                </>
              ) : (
<>
<Inbox className="mr-2 h-4 w-4" aria-hidden="true" />
Load more
                </>
              )}
</Button>
</div>
        ) : null}
</div>

{/* Side panel — rendered alongside the list, not in a portal. */}
{displayReport !== null ? (
<div
data-testid={`review-reports-side-panel-${displayReport.reportId}`}
className="h-[60vh]"
        >
<ReviewReportDetailPanel
report={displayReport}
onClose={() => setSelectedReportId(null)}
          />
</div>
      ) : null}

{/* Confirm dialog — mounted when an action is selected. */}
<ReviewReportActionConfirmDialog
open={pendingAction !== null}
report={displayReport}
action={pendingAction}
onClose={handleDialogClose}
      />
</section>
  );
}