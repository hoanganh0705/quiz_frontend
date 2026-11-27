import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import {
  FollowButtonSkeleton,
  QuizCardGrid,
} from "@/components/primitives";
import { TagPillSkeleton } from "@/components/primitives/TagPill/TagPillSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

const HEADER_TITLE_HEIGHT = "h-8 w-48";
const HEADER_SLUG_HEIGHT = "h-4 w-32";
const FOLLOW_SLOT_CONTAINER =
  "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
const STRIP_CONTAINER =
  "-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1.5 snap-x snap-proximity scroll-mt-16 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export default function TagDetailLoading() {
  return (
    <div
      className={PAGE_CONTAINER_CLASS}
      aria-busy="true"
      aria-label="Loading tag detail page"
      data-testid="tag-detail-loading"
    >
      <div
        className={FOLLOW_SLOT_CONTAINER}
        data-testid="tag-detail-header-skeleton"
      >
        <div className="flex-1">
          <header className="mb-8">
            <div className="flex items-baseline gap-3">
              <Skeleton className={HEADER_TITLE_HEIGHT} />
              <Skeleton className={HEADER_SLUG_HEIGHT} />
            </div>
            <Skeleton className="mt-2 h-3 w-40" />
          </header>
        </div>
        <FollowButtonSkeleton />
      </div>

      <div
        className="mb-8"
        aria-label="Loading tag analytics"
        data-testid="tag-detail-analytics-skeleton"
      >
        <Skeleton className="mb-3 h-5 w-24" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border bg-card p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-6 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-20 w-full rounded-md" />
      </div>

      <div
        className="mb-8"
        aria-label="Loading quizzes for this tag"
        data-testid="tag-detail-grid-skeleton"
      >
        <QuizCardGrid skeletonCount={12} />
      </div>

      <section
        className="mt-12 pt-6 border-t border-border/60 space-y-2"
        aria-label="Loading related tags"
      >
        <Skeleton className="h-5 w-28" />
        <div className={STRIP_CONTAINER}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`related-${i}`} className="shrink-0 snap-start">
              <TagPillSkeleton />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
