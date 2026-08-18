"use client";

import { HomeHeroSection } from "@/app/(public)/HomeHeroSection";
import QuizCategoriesClient from "@/app/(public)/QuizCategoriesClient";
import RecentlyPlayedSection from "@/features/users/components/RecentlyPlayedSection";
import PlayerRanking from "@/features/leaderboard/components/PlayerRanking";
import QuizCardDifficultyList from "@/features/quizzes/components/QuizCardDifficultyList";
import { HowItWorks, SuccessStoriesCarousel } from "@/features/marketing";
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
}: HomePageProps): React.ReactElement {
return (
<div className="min-h-screen p-4 md:p-6 overflow-x-hidden max-w-full">
<HomeHeroSection />

<div className="flex flex-col gap-8 mb-10">
<HomeFeaturedRail items={featured} />
<HomeTrendingRail items={trending} />
<HomePopularRail items={popular} />
</div>

<QuizCategoriesClient categories={categories} />

<RecentlyPlayedSection />
<PlayerRanking />
<QuizCardDifficultyList />
<HowItWorks />
<SuccessStoriesCarousel />
</div>
  );
}
