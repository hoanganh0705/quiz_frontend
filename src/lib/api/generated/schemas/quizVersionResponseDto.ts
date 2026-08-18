

import type { QuizVersionResponseDtoStatus } from './quizVersionResponseDtoStatus';
import type { QuizVersionResponseDtoDifficulty } from './quizVersionResponseDtoDifficulty';
import type { QuizQuestionAuthorDto } from './quizQuestionAuthorDto';

export interface QuizVersionResponseDto {

quizVersionId: string;

quizId: string;

versionNumber: number;

status: QuizVersionResponseDtoStatus;

difficulty: QuizVersionResponseDtoDifficulty;

durationMs: number;

passingScorePercent: number;

rewardXp: number;

questionCount: number;

creatorId?: string | null;

createdAt: string;

publishedAt?: string | null;

archivedAt?: string | null;

updatedAt: string;

questions?: QuizQuestionAuthorDto[] | null;
}
