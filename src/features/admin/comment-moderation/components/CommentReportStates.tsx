"use client";

import { AlertTriangle, Inbox, EyeOff } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";

import type { ApiError } from "@/lib/api/core/ApiError";

export interface CommentReportSkeletonProps {
  rows?: number;
}

export function CommentReportSkeleton({
  rows = 3,
}: CommentReportSkeletonProps): React.ReactElement {
  const count = Math.max(1, Math.floor(rows));

  return (
    <ul
      role="status"
      aria-busy="true"
      aria-label="Loading comment reports"
      className="flex flex-col gap-2.5"
      data-testid="comment-report-skeleton-list"
    >
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 shadow-2xs"
          data-testid={`comment-report-skeleton-row-${index}`}
        >
          {/* Main content placeholders */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-40" />
          </div>

          {/* Status pill & action trigger placeholders */}
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface CommentReportEmptyStateProps {
  filter: "pending" | "resolved";

  onShowResolved?: () => void;

  className?: string;
}

const EMPTY_COPY: Readonly<
  Record<"pending" | "resolved", { title: string; description: string }>
> = Object.freeze({
  pending: {
    title: "No pending comment reports",
    description:
      "No comment reports are awaiting moderation right now. New reports will appear here as they are filed.",
  },
  resolved: {
    title: "No resolved comment reports",
    description:
      "No comment reports match the resolved filter. Try the pending tab to see what is awaiting moderation.",
  },
});

export function CommentReportEmptyState({
  filter,
  onShowResolved,
  className,
}: CommentReportEmptyStateProps): React.ReactElement {
  const copy = EMPTY_COPY[filter];
  const showCta = filter === "pending" && typeof onShowResolved === "function";

  return (
    <div
      data-testid={`comment-report-empty-state-${filter}`}
      className={className}
    >
      <EmptyState
        icon={Inbox}
        title={copy.title}
        description={copy.description}
        actions={
          showCta
            ? [
                {
                  label: "View resolved reports",
                  onClick: onShowResolved as () => void,
                },
              ]
            : undefined
        }
      />
    </div>
  );
}

export interface CommentReportErrorStateProps {
  error: ApiError | null;

  onRetry?: () => void;

  className?: string;
}

export function CommentReportErrorState({
  error,
  onRetry,
  className,
}: CommentReportErrorStateProps): React.ReactElement {
  return (
    <div
      role="alert"
      className={className}
      data-testid="comment-report-error-state"
    >
      <EmptyState
        icon={AlertTriangle}
        title="Could not load comment reports"
        description="The comment-reports feed did not respond. Copy the request id and retry, or refresh the page."
        actions={
          typeof onRetry === "function"
            ? [
                {
                  label: "Retry",
                  onClick: onRetry,
                },
              ]
            : undefined
        }
      />
      <div className="mx-auto mt-3 max-w-sm">
        <RequestIdBanner error={error} />
      </div>
    </div>
  );
}

export interface CommentHiddenStateProps {
  commentId: string;

  onRestore: () => void;

  className?: string;
}

export function CommentHiddenState({
  commentId,
  onRestore,
  className,
}: CommentHiddenStateProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className={className}
      data-testid={`comment-hidden-state-${commentId}`}
    >
      <EmptyState
        icon={EyeOff}
        title="This comment is hidden"
        description="The comment is not visible to the public. You can restore it from here."
        actions={[
          {
            label: "Restore comment",
            onClick: onRestore,
          },
        ]}
      />
      <p className="mx-auto mt-2 max-w-sm text-center text-xs text-muted-foreground">
        Comment id: <span className="font-mono">{commentId}</span>
      </p>
    </div>
  );
}
