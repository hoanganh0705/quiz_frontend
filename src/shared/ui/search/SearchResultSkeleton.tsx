"use client";

import { cn } from "@/shared/utils/merge-class-names";

import { Skeleton } from "@/components/ui/Skeleton";

export const SEARCH_RESULT_KINDS = [
  "quiz",
  "user",
  "tournament",
  "achievement",
  "ranking",
  "tag",
  "category",
  "comment",
  "social",
] as const;

export type SearchResultSkeletonKind = "suggestions" | "search" | "trending";

const DEFAULT_SOCIAL_ROW_COUNT = 5;

function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-2.5", className)}>
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-4 shrink-0" />
    </div>
  );
}

function renderSocialRow(
  kind: SearchResultSkeletonKind,
  index: number,
): React.ReactElement {
  return (
    <div key={index} className="flex items-center gap-3">
      {kind === "trending" ? (
        <Skeleton className="w-6 h-6 rounded text-xs font-mono text-center" />
      ) : null}
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-col gap-1 flex-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2 w-1/4" />
      </div>
    </div>
  );
}

export interface SearchResultSkeletonProps {
  kind?: SearchResultSkeletonKind;
  rowCount?: number;
  count?: number;
  className?: string;
}

export function SearchResultSkeleton({
  kind,
  rowCount = DEFAULT_SOCIAL_ROW_COUNT,
  count = 4,
  className,
}: SearchResultSkeletonProps): React.ReactElement {
  if (kind) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={`Loading ${kind} results`}
        data-testid={`search-result-skeleton-${kind}`}
        data-row-count={rowCount}
        className={cn("flex flex-col gap-3 p-4", className)}
      >
        {Array.from({ length: rowCount }).map((_, i) =>
          renderSocialRow(kind, i),
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {SEARCH_RESULT_KINDS.map((groupKind) => (
        <section
          key={groupKind}
          aria-busy="true"
          aria-label={`Loading ${groupKind} results`}
        >
          <div className="flex items-center gap-2 pb-2 mb-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-8 rounded-full" />
          </div>
          <div className="border-b mb-1" />
          <div>
            {Array.from({ length: count }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export interface SearchResultGroupSkeletonProps {
  kind: string;
  count?: number;
  className?: string;
}

export function SearchResultGroupSkeleton({
  kind,
  count = 4,
  className,
}: SearchResultGroupSkeletonProps): React.ReactElement {
  return (
    <section
      aria-busy="true"
      aria-label={`Loading ${kind} results`}
      className={cn("space-y-1", className)}
    >
      <div className="flex items-center gap-2 pb-2 mb-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-8 rounded-full" />
      </div>
      <div className="border-b mb-1" />
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </section>
  );
}
