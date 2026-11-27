import { FollowButtonSkeleton, QuizCardGrid } from "@/components/primitives";
import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

const HEADER_TITLE_HEIGHT = "h-9 w-56";
const HEADER_DESCRIPTION_HEIGHT = "h-5 w-96";
const FOLLOW_SLOT_CONTAINER =
  "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
const GRID_PADDING = "mt-8";

export default function CategoryDetailLoading() {
  return (
    <div
      className={PAGE_CONTAINER_CLASS}
      aria-busy="true"
      aria-label="Loading category detail page"
      data-testid="category-detail-loading"
    >
      <div
        className={FOLLOW_SLOT_CONTAINER}
        data-testid="category-detail-header-skeleton"
      >
        <div className="flex-1">
          <Skeleton className={`${HEADER_TITLE_HEIGHT} mb-2`} />
          <Skeleton className={HEADER_DESCRIPTION_HEIGHT} />
        </div>
        <FollowButtonSkeleton />
      </div>

      <div
        className={GRID_PADDING}
        aria-label="Loading quizzes for this category"
        data-testid="category-detail-grid-skeleton"
      >
        <QuizCardGrid skeletonCount={12} />
      </div>
    </div>
  );
}
