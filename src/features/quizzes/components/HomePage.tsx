"use client";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import QuizCategories from "@/features/categories/components/QuizCategories";
import PlayerRanking from "@/features/leaderboard/components/PlayerRanking";
import { HowItWorks } from "@/features/marketing";
import QuizCardDifficultyList from "@/features/quizzes/components/QuizCardDifficultyList";
import RecentlyPlayedSection from "@/features/users/components/RecentlyPlayedSection";

import { HomeFeaturedRail } from "./HomeFeaturedRail";
import { HomeHeroSection } from "./HomeHeroSection";
import { HomeMetricRail } from "./HomeMetricRail";
import { RecentWinnersRail } from "./RecentWinnersRail";

import type { Category } from "@/features/categories/types";
import type {
  LeaderboardEntryDto,
  PopularQuizItemDto,
  QuizListItemDto,
  RecentWinnersResponseDto,
  TrendingQuizItemDto,
} from "@/lib/api/generated/schemas";

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
  topPlayers,
}: HomePageProps): React.ReactElement {
  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} overflow-x-hidden space-y-12 md:space-y-16`}
    >
      {/* 1. Hero & Core Value Proposition */}
      <HomeHeroSection />

      {/* 2. Resumption Hook (authenticated players jump back in immediately) */}
      <RecentlyPlayedSection />

      {/* 3. Category Arenas */}
      <QuizCategories categories={categories} />

      {/* 4. Curated Spotlight */}
      <HomeFeaturedRail items={featured} />

      {/* 5. Live Momentum & Social Proof (Recent Coin & XP Winners) */}
      <RecentWinnersRail data={recentWinners} />

      {/* 6. Skill-Based Discovery (Quizzes by Difficulty) */}
      <QuizCardDifficultyList />

      {/* 7. Community Feeds (Trending & Popular Rails) */}
      <div className="flex flex-col gap-10">
        <HomeMetricRail
          variant="trending"
          items={trending}
          categories={categories}
        />
        <HomeMetricRail
          variant="popular"
          items={popular}
          categories={categories}
        />
      </div>

      {/* 8. Competitive Apex (Top Players Leaderboard) */}
      <PlayerRanking initialPlayers={topPlayers} />

      {/* 9. Platform Primer & Onboarding (How It Works) */}
      <HowItWorks />
    </div>
  );
}
