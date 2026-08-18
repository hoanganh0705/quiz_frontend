

import type {
QuizVersionResponseDto,
QuizVersionDetailResponseDto,
CreateQuizVersionDto,
UpdateQuizVersionDto,
} from '@/lib/api/generated/schemas';

export function quizAuthorKey(quizId: string): ['quiz', 'author', string] {
return ['quiz', 'author', quizId];
}

export function quizVersionsKey(quizId: string): ['quiz', 'versions', string] {
return ['quiz', 'versions', quizId];
}

export function quizVersionKey(
quizId: string,
versionId: string,
): ['quiz', 'version', string, string] {
return ['quiz', 'version', quizId, versionId];
}

export type QuizVersionSummary = QuizVersionResponseDto & { id: string };

export type QuizVersionDetail = QuizVersionDetailResponseDto;

export interface QuizAuthorView {

quizId: string;

title: string;

description: string | null;

slug: string;

creatorId: string | null;

imageUrl: string | null;

categoryId: string | null;

isHidden: boolean;

publishedVersionId: string | null;

createdAt: string;

updatedAt: string;
}

export type { CreateQuizVersionDto, UpdateQuizVersionDto };
