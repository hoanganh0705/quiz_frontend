

import type { QuizListItemDtoCreator } from './quizListItemDtoCreator';
import type { QuizListItemDtoPublishedVersion } from './quizListItemDtoPublishedVersion';
import type { QuizTagDto } from './quizTagDto';

export interface QuizListItemDto {

quizId: string;

creatorId?: string | null;

creator: QuizListItemDtoCreator;

title: string;

description?: string | null;

slug: string;

requirements?: string | null;

imageUrl?: string | null;

categoryId?: string | null;

categoryName?: string | null;

categorySlug?: string | null;

isFeatured: boolean;

isHidden: boolean;

isVerified: boolean;

publishedVersionId?: string | null;

createdAt: string;

updatedAt: string;

publishedVersion?: QuizListItemDtoPublishedVersion;

questionCount: number;

averageRating: number;

reviewCount: number;

attemptCount: number;

tags: QuizTagDto[];
}
