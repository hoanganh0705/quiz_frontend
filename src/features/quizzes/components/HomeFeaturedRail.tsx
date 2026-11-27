"use client";

import { useState } from "react";

import {
  FEATURED_RAIL_LIMIT,
  type QuizListItemDto,
} from "@/features/quizzes/types/home-rails";

import { HomeFeaturedRefreshButton } from "./HomeFeaturedRefreshButton";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";

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
  const [refreshedItems, setRefreshedItems] = useState<
    readonly QuizListItemDto[] | null
  >(null);
  const visibleQuizzes = (refreshedItems ?? items ?? []).slice(
    0,
    FEATURED_RAIL_LIMIT,
  );

  return (
    <QuizRail
      layout="grid"
      title={title}
      subtitle="Specially selected quizzes you don’t want to miss"
      filter={
        <HomeFeaturedRefreshButton
          onRefreshed={(data) => {
            if (data?.featured) {
              setRefreshedItems(data.featured);
            }
          }}
        />
      }
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

export {
  refreshHomeBundle,
  type FeaturedRefreshHandle,
  type HomeBundleData,
} from "@/features/quizzes/services/quizzes.service";
