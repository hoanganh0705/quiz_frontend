'use client';

import { useCallback, useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import type { CommentReportDto } from '@/features/admin/comment-moderation/admin-comment-report-types';
import { useComment } from '@/features/admin/comment-moderation/hooks/useComment';
import { CommentHiddenState } from '@/features/admin/comment-moderation/components/CommentReportStates';
import type { CommentDto } from '@/lib/api/generated/schemas';

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

function readCommentDto(value: unknown): CommentDto | null {
if (value === null || typeof value !== 'object') return null;
const candidate = value as Partial<CommentDto>;
if (typeof candidate.id !== 'string') return null;
if (typeof candidate.body !== 'string') return null;
if (typeof candidate.authorId !== 'string') return null;
if (typeof candidate.isHidden !== 'boolean') return null;
return candidate as CommentDto;
}

function resolveCommentAuthorDisplay(comment: CommentDto): string {
const author = comment.author;

const rawDisplayName = author?.displayName as unknown as string | null;
if (typeof rawDisplayName === 'string' && rawDisplayName.length > 0) {
return rawDisplayName;
  }
const rawUsername = author?.username as unknown as string | null;
if (typeof rawUsername === 'string' && rawUsername.length > 0) {
return rawUsername;
  }
return comment.authorId;
}

export interface CommentReportDetailPanelProps {

report: CommentReportDto;

onClose: () => void;

onRestore: (commentId: string) => void;

className?: string;
}

export function CommentReportDetailPanel({
report,
onClose,
onRestore,
className,
}: CommentReportDetailPanelProps): React.ReactElement {

const { comment, isLoading: isCommentLoading, outcome: commentOutcome } =
useComment({ commentId: report.commentId });

const commentDto = readCommentDto(comment);

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

const handleRestore = useCallback(() => {
captureScroll();
onRestore(report.commentId);
  }, [captureScroll, onRestore, report.commentId]);

const isHidden = commentDto !== null && commentDto.isHidden === true;

return (
<aside
role="complementary"
aria-label={`Offending comment for report ${report.reportId}`}
onKeyDown={handleKeyDown}
data-testid={`comment-report-detail-panel-${report.reportId}`}
className={cn(
'flex h-full w-full flex-col gap-4 overflow-hidden rounded-lg border border-border bg-background',
className ?? '',
      )}
    >
<header
className="flex items-start justify-between gap-2 border-b border-border px-5 py-3"
data-testid={`comment-report-detail-header-${report.reportId}`}
      >
<div className="flex flex-col gap-1">
<h2 className="text-base font-semibold text-foreground">
Offending comment
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
data-testid={`comment-report-detail-close-${report.reportId}`}
        >
<X className="h-4 w-4" aria-hidden="true" />
</Button>
</header>

<div
ref={scrollRef}
data-testid={`comment-report-detail-scroll-${report.reportId}`}
className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5"
      >
{/* Snapshot block — surfaces the report metadata and the
            reporter / reported-at fields that the DTO carries. */}
<section
className="rounded-md border border-border bg-muted/40 px-4 py-3"
data-testid={`comment-report-detail-snapshot-${report.reportId}`}
        >
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Report metadata
          </p>
<p className="mt-2 text-sm text-slate-700">
Reported by{' '}
<span className="font-mono font-medium text-foreground">
{report.reporterId}
</span>
{' '}on{' '}
<span className="font-medium text-foreground">
{formatTimestamp(report.createdAt)}
</span>
</p>

<p className="mt-2 text-xs text-slate-700">
Reason:{' '}
<span className="font-medium capitalize">
{report.reason.replace(/_/g, ' ')}
</span>
</p>
{report.details !== null && report.details !== undefined && report.details.length > 0 ? (
<p className="mt-1 text-xs text-slate-700">{report.details}</p>
          ) : null}
</section>

{/* Live-fetch block — comment body, hidden state, or empty
            state. Rendered as a `CommentHiddenState` when the
            offending comment is hidden, so the restore affordance
            lights up. */}
{isHidden && commentDto !== null ? (
<CommentHiddenState
commentId={commentDto.id}
onRestore={handleRestore}
          />
        ) : (
<section
className="rounded-md border border-border px-4 py-3"
data-testid={`comment-report-detail-live-${report.reportId}`}
          >
<div className="flex items-center justify-between gap-2">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Live comment
              </p>
<Badge variant="outline" className="text-[10px]">
Live at fetch time
              </Badge>
</div>

{isCommentLoading ? (
<p
className="mt-2 text-xs text-muted-foreground"
data-testid={`comment-report-detail-live-loading-${report.reportId}`}
              >
Loading live comment…
              </p>
            ) : commentDto !== null ? (
<div className="mt-2 flex flex-col gap-1 text-xs text-slate-700">
<p>
Author:{' '}
<span className="font-medium">
{resolveCommentAuthorDisplay(commentDto)}
</span>
{commentDto.author?.username !== undefined ? (
<span className="text-muted-foreground">
{' '}(
                      <span className="font-mono">{commentDto.authorId}</span>
)
                    </span>
                  ) : null}
</p>
<p>
Created:{' '}
<span className="font-medium">
{formatTimestamp(commentDto.createdAt)}
</span>
</p>
{commentDto.updatedAt !== commentDto.createdAt ? (
<p>
Last updated:{' '}
<span className="font-medium">
{formatTimestamp(commentDto.updatedAt)}
</span>
</p>
                ) : null}
<p
className="mt-2 rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
data-testid={`comment-report-detail-live-text-${report.reportId}`}
                >
{commentDto.body}
</p>
</div>
            ) : (
<p
className="mt-2 text-xs text-muted-foreground"
data-testid={`comment-report-detail-live-empty-${report.reportId}`}
              >
{commentOutcome === 'not-found'
? 'The offending comment no longer exists. The report metadata above is still authoritative.'
: 'The live comment could not be loaded. The report metadata above is still authoritative.'}
</p>
            )}

{commentOutcome === 'forbidden' ? (
<p
className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700"
role="status"
data-testid={`comment-report-detail-live-error-${report.reportId}`}
              >
<AlertCircle className="h-3 w-3" aria-hidden="true" />
Live comment is unavailable; the report metadata above
                is still authoritative.
              </p>
            ) : null}
</section>
        )}

{/* Audit trail block — surfaced when the report is closed. */}
{report.status !== 'open' ? (
<section
className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900"
data-testid={`comment-report-detail-resolved-${report.reportId}`}
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
{report.reviewedAt !== null && report.reviewedAt !== undefined ? (
<p className="mt-1">
Reviewed at:{' '}
<span className="font-medium">
{formatTimestamp(report.reviewedAt)}
</span>
</p>
            ) : null}
{report.reviewedByUserId !== null && report.reviewedByUserId !== undefined ? (
<p className="mt-1">
Reviewed by:{' '}
<span className="font-mono">{report.reviewedByUserId}</span>
</p>
            ) : null}
</section>
        ) : null}
</div>

<footer
className="flex items-center justify-between gap-2 border-t border-border px-5 py-3"
data-testid={`comment-report-detail-footer-${report.reportId}`}
      >
<p className="text-xs text-muted-foreground">
{report.status === 'open'
? 'Awaiting moderation.'
: 'Closed.'}
</p>
<Button
type="button"
variant="outline"
size="sm"
onClick={handleClose}
data-testid={`comment-report-detail-close-footer-${report.reportId}`}
        >
Close
        </Button>
</footer>
</aside>
  );
}