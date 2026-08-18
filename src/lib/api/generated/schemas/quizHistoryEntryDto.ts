

import type { QuizHistoryEntryDtoStatus } from './quizHistoryEntryDtoStatus';
import type { QuizHistoryEntryDtoDifficulty } from './quizHistoryEntryDtoDifficulty';

export interface QuizHistoryEntryDto {

id: string;

quizId: string;

quizTitle: string;

quizSlug: string;

status: QuizHistoryEntryDtoStatus;

score: number | null;

correctAnswers: number | null;

totalQuestions: number;

timeTaken: number | null;

xpEarned: number;

completedAt: string;

difficulty: QuizHistoryEntryDtoDifficulty;
}
