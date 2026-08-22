"use client";

import { FEATURED_RAIL_LIMIT, type QuizListItemDto } from "@/features/quizzes/types/home-rails";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";
import { HomeFeaturedRefreshButton } from "./HomeFeaturedRefreshButton";

export interface HomeFeaturedRailProps {
  items?: readonly QuizListItemDto[];
  title?: string;
  className?: string;
}

export function HomeFeaturedRail({
  items,
  title = "Featured",
  className,
}: HomeFeaturedRailProps): React.ReactElement {
  // Featured items are provided by the server-rendered bundle. The rail
  // never re-fetches on mount; the refresh button (in the rail's header)
  // re-fetches explicitly and seeds the SWR cache so any rail that reads
  // `["home", "bundle"]` resyncs.
  const visibleQuizzes = (items ?? []).slice(0, FEATURED_RAIL_LIMIT);

  return (
    <QuizRail
      layout="grid"
      title={title}
      subtitle="Specially selected quizzes you don’t want to miss"
      filter={<HomeFeaturedRefreshButton />}
      gridItems={visibleQuizzes}
      className={className}
    >
      {visibleQuizzes.length === 0 ? (
        <QuizRailEmpty
          title="Featured set is being curated"
          description="Check back soon, or refresh to see the latest selections."
        />
      ) : null}
    </QuizRail>
  );
}

// Re-export so other rails can drive the same cache key.
export {
  refreshHomeBundle,
  type FeaturedRefreshHandle,
  type HomeBundleData,
} from "./refresh-home-bundle";