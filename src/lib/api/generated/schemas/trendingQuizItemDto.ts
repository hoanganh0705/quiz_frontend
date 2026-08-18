

import type { TrendingQuizItemDtoCreatorId } from './trendingQuizItemDtoCreatorId';

export interface TrendingQuizItemDto {

rank: number;

quizId: string;

creatorId?: TrendingQuizItemDtoCreatorId;

title: string;

slug: string;

imageUrl?: string | null;

trendingScore: number;

totalAttempts: number;

recentAttempts: number;
}
