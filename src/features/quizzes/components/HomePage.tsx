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
    <div className="min-h-screen px-4 sm:px-6 py-4 sm:py-6 overflow-x-hidden space-y-12 md:space-y-16">
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
        <HomeTrendingRail items={trending} categories={categories} />
        <HomePopularRail items={popular} categories={categories} />
      </div>

      {/* 8. Competitive Apex (Top Players Leaderboard) */}
      <PlayerRanking />

      {/* 9. Platform Primer & Onboarding (How It Works) */}
      <HowItWorks />
    </div>
  );
}
