"use client";

import { HomeHeroSection } from "./HomeHeroSection";
import QuizCategories from "@/features/categories/components/QuizCategories";
import RecentlyPlayedSection from "@/features/users/components/RecentlyPlayedSection";
import PlayerRanking from "@/features/leaderboard/components/PlayerRanking";
import QuizCardDifficultyList from "@/features/quizzes/components/QuizCardDifficultyList";
import { HowItWorks } from "@/features/marketing";
import type { Category } from "@/features/categories/types";
import type {
  LeaderboardEntryDto,
  PopularQuizItemDto,
  QuizListItemDto,
  RecentWinnersResponseDto,
  TrendingQuizItemDto,
} from "@/lib/api/generated/schemas";

import { HomeFeaturedRail } from "./HomeFeaturedRail";
import { HomeTrendingRail } from "./HomeTrendingRail";
import { HomePopularRail } from "./HomePopularRail";
import { RecentWinnersRail } from "./RecentWinnersRail";

export interface HomePageProps {
  categories: Category[];
  featured?: readonly QuizListItemDto[];
  trending?: readonly TrendingQuizItemDto[];
  popular?: readonly PopularQuizItemDto[];
  recentWinners?: RecentWinnersResponseDto | null;
  topPlayers?: readonly LeaderboardEntryDto[];
}

export function HomePage({
  categories,
  featured,
  trending,
  popular,
  recentWinners,
}: HomePageProps): React.ReactElement {
  return (
    <div className="min-h-screen px-4 sm:px-6 py-4 sm:py-6 overflow-x-hidden space-y-12">
      <HomeHeroSection />

      <QuizCategories categories={categories} />

      <div className="flex flex-col gap-8">
        <HomeFeaturedRail items={featured} />
        <HomeTrendingRail items={trending} categories={categories} />
        <HomePopularRail items={popular} categories={categories} />
      </div>

      <RecentWinnersRail data={recentWinners} />

      <RecentlyPlayedSection />

      <QuizCardDifficultyList />

      <PlayerRanking />

      <HowItWorks />
    </div>
  );
}
