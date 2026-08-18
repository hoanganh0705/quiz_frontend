

import type { RecentlyPlayedQuizItemDtoDifficulty } from './recentlyPlayedQuizItemDtoDifficulty';
import type { RecentlyPlayedQuizItemDtoImageUrl } from './recentlyPlayedQuizItemDtoImageUrl';

export interface RecentlyPlayedQuizItemDto {

quizId: string;

quizTitle: string;

slug: string;

difficulty: RecentlyPlayedQuizItemDtoDifficulty;

imageUrl: RecentlyPlayedQuizItemDtoImageUrl;

playedAt: string;

scorePercent: number;
}
