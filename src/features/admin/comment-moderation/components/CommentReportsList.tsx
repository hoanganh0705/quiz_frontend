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
import { useSWRConfig } from 'swr';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import {
useCommentReports,
type CommentReportsShow,
} from '@/features/admin/comment-moderation/hooks/useCommentReports';
import { useComment } from '@/features/admin/comment-moderation/hooks/useComment';
import { commentIdKey } from '@/features/admin/comment-moderation/hooks/commentIdKeys';
import type { CommentReportConsumerAction } from '@/features/admin/comment-moderation/action-enum';
import type {
CommentReportDto,
} from '@/features/admin/comment-moderation/admin-comment-report-types';

import { CommentReportItem } from '@/features/admin/comment-moderation/components/CommentReportItem';
import { CommentReportDetailPanel } from '@/features/admin/comment-moderation/components/CommentReportDetailPanel';
import { CommentReportActionConfirmDialog } from '@/features/admin/comment-moderation/components/CommentReportActionConfirmDialog';
import { RestoreCommentDialog } from '@/features/admin/comment-moderation/components/CommentVisibilityDialogs';
import { CommentReportSkeleton } from '@/features/admin/comment-moderation/components/CommentReportStates';

import type { CommentDto } from '@/lib/api/generated/schemas';

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

function readCommentAuthorId(value: unknown): string | null {
if (value === null || typeof value !== 'object') return null;
const candidate = value as Partial<CommentDto>;
return typeof candidate.authorId === 'string' && candidate.authorId.length > 0
? candidate.authorId
: null;
}

function CommentCacheWarmer({ commentId }: { commentId: string }): null {
useComment({ commentId });
return null;
}

const SHOW_TOGGLE_OPTIONS: ReadonlyArray<{
value: CommentReportsShow;
label: string;
}> = Object.freeze([
{ value: 'pending', label: 'Pending' },
{ value: 'resolved', label: 'Resolved' },
] as const);

export interface CommentReportsListProps {

initialShow?: CommentReportsShow;

enabled?: boolean;

className?: string;
}

export function CommentReportsList({
initialShow: _initialShow,
enabled = true,
className,
}: CommentReportsListProps): React.ReactElement {
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
  } = useCommentReports({ enabled });

const { cache } = useSWRConfig();

const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
const [pendingAction, setPendingAction] = useState<CommentReportConsumerAction | null>(
null,
  );
const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);

const selectedReport = useMemo<CommentReportDto | null>(() => {
if (selectedReportId === null) return null;
return items.find((item) => item.reportId === selectedReportId) ?? null;
  }, [items, selectedReportId]);

const scrollerRef = useRef<HTMLDivElement | null>(null);

useScrollPreserveBoundary(scrollerRef, [items.length]);

const handleSelect = useCallback(
(report: CommentReportDto) => {
setSelectedReportId((current) =>
current === report.reportId ? null : report.reportId,
      );
    },
[],
  );

const handleAction = useCallback(
(action: CommentReportConsumerAction, report: CommentReportDto) => {
setSelectedReportId(report.reportId);
setPendingAction(action);
    },
[],
  );

const handleDialogClose = useCallback(() => {
setPendingAction(null);
  }, []);

const handleShowChange = useCallback(
(next: CommentReportsShow) => {
setShow(next);
    },
[setShow],
  );

const handleRestore = useCallback((commentId: string) => {
setRestoreTargetId(commentId);
  }, []);

const handleRestoreClose = useCallback(() => {
setRestoreTargetId(null);
  }, []);

useEffect(() => {
setSelectedReportId(null);
setPendingAction(null);
  }, [show]);

const handleScroll = useCallback((_event: UIEvent<HTMLDivElement>) => {
    // The scroll position is captured by `useScrollPreserveBoundary`
    // via a microtask; this handler is a placeholder for future
    // virtualisation hooks (e.g. infinite-scroll triggers).
  }, []);

const authorIdByReportId = useMemo(() => {
const map = new Map<string, string | null>();
for (const item of items) {

const key = commentIdKey(item.commentId) as unknown as string;
const cached = cache.get(key);
const data = (cached as { data?: unknown } | undefined)?.data;
map.set(item.reportId, readCommentAuthorId(data));
    }
return map;
  }, [items, cache]);

const renderRows = () => {
if (isLoading) {
return <CommentReportSkeleton rows={3} />;
    }

if (error !== null) {
return (
<div
role="alert"
data-testid="comment-reports-list-error"
className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-900"
        >
<p className="font-semibold">Could not load comment reports</p>
<p className="mt-1">
The queue did not respond. Use the retry button to try again.
          </p>
<div className="mt-2">
<Button
type="button"
size="sm"
variant="outline"
onClick={() => {
void refresh();
              }}
data-testid="comment-reports-list-retry"
            >
Retry
            </Button>
</div>
</div>
      );
    }

if (items.length === 0) {
return (
<div
role="status"
data-testid={`comment-reports-list-empty-${show}`}
className="rounded-md border border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground"
        >
<Inbox className="mx-auto h-6 w-6" aria-hidden="true" />
<p className="mt-2 font-medium text-foreground">
No {show === 'pending' ? 'pending' : 'resolved'} comment reports
          </p>
<p className="mt-1">
{show === 'pending'
? 'No comment reports are awaiting moderation right now.'
: 'No resolved comment reports match this filter.'}
</p>
{show === 'pending' ? (
<div className="mt-3">
<Button
type="button"
size="sm"
variant="outline"
onClick={() => handleShowChange('resolved')}
data-testid="comment-reports-list-show-resolved"
              >
View resolved reports
              </Button>
</div>
          ) : null}
</div>
      );
    }

return (
<div
role="list"
aria-label={`Comment reports (${show})`}
className="flex flex-col gap-2"
data-testid={`comment-reports-list-${show}`}
      >
{items.map((report) => (
<CommentReportItem
key={report.reportId}
report={report}
commentAuthorId={authorIdByReportId.get(report.reportId) ?? null}
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
data-testid="comment-reports-list"
className={cn('flex flex-col gap-4', className ?? '')}
    >
<header
className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
data-testid="comment-reports-list-header"
      >
<div role="tablist" aria-label="Filter comment reports" className="inline-flex rounded-md border border-border bg-background p-0.5">
{SHOW_TOGGLE_OPTIONS.map((option) => {
const isActive = option.value === show;
return (
<button
key={option.value}
role="tab"
type="button"
aria-selected={isActive}
aria-controls={`comment-reports-list-${option.value}`}
onClick={() => handleShowChange(option.value)}
data-testid={`comment-reports-list-tab-${option.value}`}
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
data-testid="comment-reports-list-count"
        >
{items.length} report{items.length === 1 ? '' : 's'}
</p>
</header>

<div
ref={scrollerRef}
onScroll={handleScroll}
data-testid="comment-reports-list-scroller"
className="relative max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background p-3"
      >
{renderRows()}

{hasMore && !isLoading && error === null ? (
<div
className="mt-3 flex items-center justify-center"
data-testid="comment-reports-list-load-more"
          >
<Button
type="button"
variant="outline"
size="sm"
onClick={() => {
void loadMore();
              }}
disabled={isLoadingMore}
data-testid="comment-reports-list-load-more-button"
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

{/* Hidden warmers: keep the SWR cache populated for every
          comment id in the active page so each row's action menu
          can read the author id without an explicit click on the
          row. The warmers run alongside the visible rows; the
          comment payload is consumed by the side panel when the
          admin selects the corresponding row. */}
{items.map((report) => (
<CommentCacheWarmer key={`warmer-${report.reportId}`} commentId={report.commentId} />
      ))}

{/* Side panel — rendered alongside the list, not in a portal. */}
{selectedReport !== null ? (
<div
data-testid={`comment-reports-side-panel-${selectedReport.reportId}`}
className="h-[60vh]"
        >
<CommentReportDetailPanel
report={selectedReport}
onClose={() => setSelectedReportId(null)}
onRestore={handleRestore}
          />
</div>
      ) : null}

{/* Confirm dialog — mounted when an action is selected. */}
<CommentReportActionConfirmDialog
open={pendingAction !== null}
report={selectedReport}
action={pendingAction}
onClose={handleDialogClose}
      />

{/* Restore dialog — side-channel from the hidden-state affordance. */}
<RestoreCommentDialog
open={restoreTargetId !== null}
commentId={restoreTargetId}
onClose={handleRestoreClose}
      />
</section>
  );
}