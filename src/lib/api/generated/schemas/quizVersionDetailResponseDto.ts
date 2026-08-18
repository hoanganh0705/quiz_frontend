

import type { QuizVersionDetailResponseDtoStatus } from './quizVersionDetailResponseDtoStatus';
import type { QuizQuestionAuthorDto } from './quizQuestionAuthorDto';

export interface QuizVersionDetailResponseDto {

quizVersionId: string;

quizId: string;

versionNumber: number;

status: QuizVersionDetailResponseDtoStatus;

title: string;

description?: string | null;

passingScorePercent: number;

durationMs: number;

questions: QuizQuestionAuthorDto[];

createdAt: string;

updatedAt: string;
}
