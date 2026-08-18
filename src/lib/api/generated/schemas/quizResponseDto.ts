

import type { QuizResponseDtoCreator } from './quizResponseDtoCreator';
import type { QuizResponseDtoPublishedVersion } from './quizResponseDtoPublishedVersion';
import type { QuizTagDto } from './quizTagDto';

export interface QuizResponseDto {

quizId: string;

creatorId?: string | null;

creator: QuizResponseDtoCreator;

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

publishedVersion?: QuizResponseDtoPublishedVersion;

tags: QuizTagDto[];
}
