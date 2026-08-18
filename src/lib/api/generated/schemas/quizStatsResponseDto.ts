

import type { QuizStatsHistoryPointDto } from './quizStatsHistoryPointDto';

export interface QuizStatsResponseDto {

quizId: string;

totalAttempts: number;

uniquePlayers: number;

averageScore: number;

averageRating: number;

bookmarkCount: number;

completionRate: number;

popularityScore: number;

trendingScore: number;

commentsCount: number;

recentActivity: QuizStatsHistoryPointDto[];
}
