'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Star, X, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';
import { useReview } from '@/features/admin/review-moderation/hooks/useReview';
import { useResolveReviewReport } from '@/features/admin/review-moderation/hooks/useResolveReviewReport';

function formatTimestamp(value: string | null | undefined): string {
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

export interface ReviewReportDetailPanelProps {

report: AdminReportDto;

onClose: () => void;

className?: string;
}

export function ReviewReportDetailPanel({
report,
onClose,
className,
}: ReviewReportDetailPanelProps): React.ReactElement {

const { review, isLoading: isReviewLoading, error: reviewError } =
useReview(report.reviewId);

const { isPending: isResolving } = useResolveReviewReport();

const scrollRef = useRef<HTMLDivElement | null>(null);

const captureScroll = useCallback(() => {
const node = scrollRef.current;
if (node === null) return;
node.setAttribute('data-scroll-top', String(node.scrollTop));
  }, []);

useEffect(() => {
const node = scrollRef.current;
if (node === null) return;
const captured = node.getAttribute('data-scroll-top');
if (typeof captured === 'string' && captured.length > 0) {
const value = Number(captured);
if (!Number.isNaN(value)) {
node.scrollTop = value;
      }
    }
captureScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.reportId]);

const handleClose = useCallback(() => {
captureScroll();
onClose();
  }, [captureScroll, onClose]);

const handleKeyDown = useCallback(
(event: React.KeyboardEvent<HTMLDivElement>) => {
if (event.key === 'Escape') {
event.preventDefault();
handleClose();
      }
    },
[handleClose],
  );

return (
<aside
role="complementary"
aria-label={`Offending review for report ${report.reportId}`}
onKeyDown={handleKeyDown}
data-testid={`review-report-detail-panel-${report.reportId}`}
className={cn(
'flex h-full w-full flex-col gap-4 overflow-hidden rounded-lg border border-border bg-background',
className ?? '',
      )}
    >
<header
className="flex items-start justify-between gap-2 border-b border-border px-5 py-3"
data-testid={`review-report-detail-header-${report.reportId}`}
      >
<div className="flex flex-col gap-1">
<h2 className="text-base font-semibold text-foreground">
Offending review
          </h2>
<p className="text-xs text-muted-foreground">
Report <span className="font-mono">{report.reportId}</span>
</p>
</div>
<Button
type="button"
variant="ghost"
size="icon"
aria-label="Close detail panel"
onClick={handleClose}
data-testid={`review-report-detail-close-${report.reportId}`}
        >
<X className="h-4 w-4" aria-hidden="true" />
</Button>
</header>

<div
ref={scrollRef}
data-testid={`review-report-detail-scroll-${report.reportId}`}
className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5"
      >
{/* Snapshot block — always rendered. */}
<section
className="rounded-md border border-border bg-muted/40 px-4 py-3"
data-testid={`review-report-detail-snapshot-${report.reportId}`}
        >
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Snapshot at report time
          </p>
<p className="mt-2 text-sm font-medium text-foreground">
{report.quizTitle}
</p>
<p className="mt-1 text-xs text-muted-foreground">
Reported by{' '}
<span className="font-medium text-foreground">
{report.reviewerUsername}
</span>
</p>

<div className="mt-2 flex items-center gap-2">
<span className="inline-flex items-center gap-0.5">
{Array.from({ length: 5 }, (_, index) => (
<Star
key={index}
aria-hidden="true"
className={cn(
'h-4 w-4',
index < report.rating
? 'fill-amber-400 stroke-amber-500'
: 'fill-transparent stroke-slate-300',
                  )}
                />
              ))}
</span>
<span className="text-sm font-medium">{report.rating}/5</span>
</div>

{report.comment !== null && report.comment !== undefined ? (
<p className="mt-3 rounded-sm border border-border bg-background px-3 py-2 text-sm italic text-foreground">
&ldquo;{report.comment}&rdquo;
            </p>
          ) : (
<p className="mt-3 text-xs italic text-muted-foreground">
The reviewer did not leave a comment.
            </p>
          )}

<p className="mt-3 text-xs text-slate-700">
Reason:{' '}
<span className="font-medium capitalize">
{report.reason.replace(/_/g, ' ')}
</span>
</p>
{report.details !== null && report.details !== undefined ? (
<p className="mt-1 text-xs text-slate-700">{report.details}</p>
          ) : null}
</section>

{/* Live-fetch fallback block — only when the DTO doesn't
            carry the live values and `useReview` can fill them in. */}
<section
className="rounded-md border border-border px-4 py-3"
data-testid={`review-report-detail-live-${report.reportId}`}
        >
<div className="flex items-center justify-between gap-2">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Live review
            </p>
<Badge variant="outline" className="text-[10px]">
Live at fetch time
            </Badge>
</div>

{isReviewLoading ? (
<p
className="mt-2 text-xs text-muted-foreground"
data-testid={`review-report-detail-live-loading-${report.reportId}`}
            >
Loading live review…
            </p>
          ) : review !== null ? (
<div className="mt-2 flex flex-col gap-1 text-xs text-slate-700">
<p>
Reviewer:{' '}
<span className="font-medium">{review.username}</span>{' '}
<span className="text-muted-foreground">
({review.userId})
                </span>
</p>
<p>
Helpful votes:{' '}
<span className="font-medium">{review.helpfulCount}</span>
</p>
<p>
Created:{' '}
<span className="font-medium">
{formatTimestamp(review.createdAt)}
</span>
</p>
{review.updatedAt !== review.createdAt ? (
<p>
Last updated:{' '}
<span className="font-medium">
{formatTimestamp(review.updatedAt)}
</span>
</p>
              ) : null}
</div>
          ) : (
<p
className="mt-2 text-xs text-muted-foreground"
data-testid={`review-report-detail-live-empty-${report.reportId}`}
            >
The live review could not be loaded. The snapshot above
              still reflects the report time.
            </p>
          )}

{reviewError !== null ? (
<p
className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700"
role="status"
data-testid={`review-report-detail-live-error-${report.reportId}`}
            >
<AlertCircle className="h-3 w-3" aria-hidden="true" />
Live review is unavailable; the snapshot above is still
              authoritative.
            </p>
          ) : null}
</section>

{/* Audit trail block — surfaced when the report is closed. */}
{report.status !== 'open' ? (
<section
className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900"
data-testid={`review-report-detail-resolved-${report.reportId}`}
          >
<p className="font-semibold">This report is closed.</p>
{report.updatedAt !== null && report.updatedAt !== undefined ? (
<p className="mt-1">
Last updated:{' '}
<span className="font-medium">
{formatTimestamp(report.updatedAt)}
</span>
</p>
            ) : null}
</section>
        ) : null}
</div>

<footer
className="flex items-center justify-between gap-2 border-t border-border px-5 py-3"
data-testid={`review-report-detail-footer-${report.reportId}`}
      >
<p className="text-xs text-muted-foreground">
{isResolving
? 'Resolving…'
: report.status === 'open'
? 'Awaiting moderation.'
: 'Closed.'}
</p>
<Button
type="button"
variant="outline"
size="sm"
onClick={handleClose}
data-testid={`review-report-detail-close-footer-${report.reportId}`}
        >
Close
        </Button>
</footer>
</aside>
  );
}