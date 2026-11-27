import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { HomeHeroSection } from "@/features/quizzes";
import { QuizRailSkeleton } from "@/features/quizzes/components/QuizRailSkeleton";
import {
  FEATURED_RAIL_LIMIT,
  POPULAR_RAIL_LIMIT,
  TRENDING_RAIL_LIMIT,
} from "@/features/quizzes/types/home-rails";

export default function Loading() {
  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} overflow-x-hidden max-w-full`}
      data-testid="home-loading"
      aria-busy="true"
      aria-label="Loading home page"
    >
      <HomeHeroSection />

      <div className="flex flex-col gap-8 mb-10">
        <QuizRailSkeleton layout="grid" count={FEATURED_RAIL_LIMIT} />
        <QuizRailSkeleton layout="scroller" count={TRENDING_RAIL_LIMIT} />
        <QuizRailSkeleton layout="scroller" count={POPULAR_RAIL_LIMIT} />
      </div>

      <div
        className="mb-10 h-32 rounded-xl border border-border bg-main"
        aria-hidden="true"
      />

      <div
        className="mb-10 h-64 rounded-xl border border-border bg-main"
        aria-hidden="true"
      />

      <div
        className="mb-10 h-48 rounded-xl border border-border bg-main"
        aria-hidden="true"
      />

      <div
        className="mb-10 h-72 rounded-xl border border-border bg-main"
        aria-hidden="true"
      />

      <div
        className="mb-10 h-48 rounded-xl border border-border bg-main"
        aria-hidden="true"
      />

      <div
        className="mb-10 h-64 rounded-xl border border-border bg-main"
        aria-hidden="true"
      />
    </div>
  );
}
