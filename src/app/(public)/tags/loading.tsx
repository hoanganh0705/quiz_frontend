import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { TagPillSkeleton } from "@/components/primitives/TagPill/TagPillSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

const STRIP_CONTAINER =
  "-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1.5 snap-x snap-proximity scroll-mt-16 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
const GRID_LAYOUT = "flex flex-wrap gap-x-2 gap-y-3 sm:gap-2.5";
const SKELETON_WIDTHS = [
  "w-24",
  "w-32",
  "w-28",
  "w-20",
  "w-36",
  "w-28",
] as const;

export default function TagsLoading() {
  return (
    <div
      className={`@container ${PAGE_CONTAINER_CLASS} space-y-8 md:space-y-10`}
      aria-busy="true"
      aria-label="Loading tags directory"
      data-testid="tags-directory-loading"
    >
      <header className="space-y-2">
        <Skeleton className="h-9 sm:h-10 w-36" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </header>

      <div className="space-y-5">
        <section className="space-y-1.5" aria-label="Loading popular tags">
          <div className="flex min-h-8 items-center">
            <Skeleton className="h-5 w-28" />
          </div>
          <div className={STRIP_CONTAINER}>
            {SKELETON_WIDTHS.map((widthClass, i) => (
              <div key={`popular-${i}`} className="shrink-0 snap-start">
                <TagPillSkeleton className={widthClass} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-1.5" aria-label="Loading trending tags">
          <div className="flex min-h-8 items-center">
            <Skeleton className="h-5 w-28" />
          </div>
          <div className={STRIP_CONTAINER}>
            {SKELETON_WIDTHS.map((widthClass, i) => (
              <div key={`trending-${i}`} className="shrink-0 snap-start">
                <TagPillSkeleton className={widthClass} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section
        className="space-y-5 pt-6 border-t border-border/60"
        aria-label="Loading all tags"
      >
        <div className="flex flex-col gap-3.5 @2xl:flex-row @2xl:items-center @2xl:justify-between border-b border-border/60 pb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 sm:h-9 w-full @2xl:w-80 rounded-md" />
        </div>

        <div className={GRID_LAYOUT}>
          {Array.from({ length: 24 }).map((_, i) => (
            <TagPillSkeleton
              key={`dir-${i}`}
              className={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
