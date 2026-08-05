"use client";

/**
 * `SearchResultSkeleton.tsx` — skeleton primitives for the search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.C1.
 *
 * Provides loading skeleton rows for the unified search results surface.
 * Each skeleton mirrors the shape of the real result card so the layout
 * does not shift when real data arrives.
 *
 * No service, hook, or socket client is imported by this primitive.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * The result kinds that appear in the search response.
 * Ordered to match the `SearchResultKind` documentation order.
 */
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

// ─── Per-kind skeleton rows ───────────────────────────────────────────────

/**
 * Generic skeleton row matching the base `BaseSearchResult` shape:
 * icon placeholder + title + subtitle + navigation arrow.
 */
function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-2.5", className)}>
      {/* Icon / avatar placeholder */}
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      {/* Title + subtitle */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {/* Navigation arrow placeholder */}
      <Skeleton className="h-4 w-4 shrink-0" />
    </div>
  );
}

// ─── Skeleton for the entire results list ─────────────────────────────────

interface SearchResultSkeletonProps {
  /** Number of skeleton rows to render per group. Defaults to 4. */
  count?: number;
  className?: string;
}

/**
 * Skeleton for the unified search results list.
 *
 * Renders N skeleton rows per visible result kind group, matching the
 * layout of `SearchResults` and `SearchResultGroup`. The component
 * renders no real content — all skeletons are deterministic placeholders.
 */
export function SearchResultSkeleton({
  count = 4,
  className,
}: SearchResultSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {SEARCH_RESULT_KINDS.map((kind) => (
        <section key={kind} aria-busy="true" aria-label={`Loading ${kind} results`}>
          {/* Group header skeleton */}
          <div className="flex items-center gap-2 pb-2 mb-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-8 rounded-full" />
          </div>
          {/* Divider */}
          <div className="border-b mb-1" />
          {/* Rows */}
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

// ─── Per-group skeleton (used by the container) ────────────────────────────

interface SearchResultGroupSkeletonProps {
  /** Result kind label for the group header. */
  kind: string;
  /** Number of skeleton rows. Defaults to 4. */
  count?: number;
  className?: string;
}

/**
 * Skeleton for a single result group, matching `SearchResultGroup`.
 *
 * Accepts `kind` so the group header label renders correctly.
 */
export function SearchResultGroupSkeleton({
  kind,
  count = 4,
  className,
}: SearchResultGroupSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-label={`Loading ${kind} results`}
      className={cn("space-y-1", className)}
    >
      {/* Group header skeleton */}
      <div className="flex items-center gap-2 pb-2 mb-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-8 rounded-full" />
      </div>
      {/* Divider */}
      <div className="border-b mb-1" />
      {/* Rows */}
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </section>
  );
}

interface SearchResultGroupSkeletonProps {
  /** Result kind label for the group header. */
  kind: string;
  /** Number of skeleton rows. Defaults to 4. */
  count?: number;
  className?: string;
}