

import type { CategoryAnalyticsTopQuizDtoImageUrl } from './categoryAnalyticsTopQuizDtoImageUrl';

export interface CategoryAnalyticsTopQuizDto {

rank: number;

quizId: string;

title: string;

slug: string;

imageUrl: CategoryAnalyticsTopQuizDtoImageUrl;

popularityScore: number;

totalAttempts: number;

averageRating: number;

bookmarkCount: number;
}
