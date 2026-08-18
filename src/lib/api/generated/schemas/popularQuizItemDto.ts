

import type { PopularQuizItemDtoCreatorId } from './popularQuizItemDtoCreatorId';

export interface PopularQuizItemDto {

rank: number;

quizId: string;

creatorId?: PopularQuizItemDtoCreatorId;

title: string;

slug: string;

imageUrl?: string | null;

popularityScore: number;

totalAttempts: number;

averageRating: number;

bookmarkCount: number;
}
