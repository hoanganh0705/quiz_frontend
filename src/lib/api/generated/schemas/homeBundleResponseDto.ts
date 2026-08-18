

import type { QuizListItemDto } from './quizListItemDto';
import type { TrendingQuizItemDto } from './trendingQuizItemDto';
import type { PopularQuizItemDto } from './popularQuizItemDto';
import type { CategoryResponseDto } from './categoryResponseDto';
import type { RecentWinnersResponseDto } from './recentWinnersResponseDto';
import type { LeaderboardEntryDto } from './leaderboardEntryDto';

export interface HomeBundleResponseDto {

featured: QuizListItemDto[];

trending: TrendingQuizItemDto[];

popular: PopularQuizItemDto[];

categories: CategoryResponseDto[];

recentWinners: RecentWinnersResponseDto;

topPlayers: LeaderboardEntryDto[];
}
