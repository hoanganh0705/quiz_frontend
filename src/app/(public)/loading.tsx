import { HomeHeroSection } from "./HomeHeroSection";

import {
  FEATURED_RAIL_LIMIT,
  TRENDING_RAIL_LIMIT,
  POPULAR_RAIL_LIMIT,
} from "@/features/quizzes/types/home-rails";
import { QuizRailSkeleton } from "@/features/quizzes/components/QuizRailSkeleton";

export default function Loading() {
  return (
    <div
      className="min-h-screen p-4 md:p-6 overflow-x-hidden max-w-full"
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
    </div>
  );
}
