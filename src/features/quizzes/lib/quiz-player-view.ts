

import type { QuizResponseDto } from '@/lib/api/generated/schemas/quizResponseDto';
import type { QuizAnswerOptionPlayerDto } from '@/lib/api/generated/schemas/quizAnswerOptionPlayerDto';
import {
CAPTURE_REASONS,
CAPTURE_SURFACES,
captureException,
} from '@/lib/observability/sentry-capture';

export type PlayerAnswerOption = QuizAnswerOptionPlayerDto;

export interface PlayerQuestion {
questionId: string;
quizVersionId: string;
position: number;
questionText: string;
imageUrl: string | null;
answerOptions: PlayerAnswerOption[];
}

export interface PlayerPublishedVersion {
quizVersionId: string;
versionNumber: number;
difficulty: QuizResponseDto['publishedVersion'] extends infer V
    ? V extends { difficulty: infer D }
      ? D
      : never
    : never;
durationMs: number;
passingScorePercent: number;
rewardXp: number;
questions: PlayerQuestion[];
}

export interface PlayerQuizDetail {
quizId: string;
creatorId: string | null;
title: string;
description: string | null;
slug: string;
requirements: string | null;
imageUrl: string | null;
categoryId: string | null;
isFeatured: boolean;
isHidden: boolean;
isVerified: boolean;
publishedVersionId: string | null;
publishedVersion: PlayerPublishedVersion | null;
tags: QuizResponseDto['tags'];
createdAt: string;
updatedAt: string;
}

interface RawAnswerOptionAtBoundary {
optionId: string;
position: number;
value: string;
createdAt: string;
isCorrect?: unknown;
}

interface RawQuestionAtBoundary {
questionId: string;
quizVersionId: string;
position: number;
questionText: string;
imageUrl?: string | null;
createdAt: string;
updatedAt: string;
answerOptions: RawAnswerOptionAtBoundary[];
}

interface RawPublishedVersionAtBoundary {
quizVersionId: string;
versionNumber: number;
difficulty: PlayerPublishedVersion['difficulty'];
durationMs: number;
passingScorePercent: number;
rewardXp: number;
questions?: RawQuestionAtBoundary[] | null;
}

function hasIsCorrectKey(
option: RawAnswerOptionAtBoundary,
): boolean {
return Object.prototype.hasOwnProperty.call(option, 'isCorrect');
}

function projectOption(
option: RawAnswerOptionAtBoundary,
quizId: string,
): PlayerAnswerOption {
if (hasIsCorrectKey(option)) {
captureException(
new Error('Quiz answer option leaked isCorrect on player view'),
{
tags: {
surface: CAPTURE_SURFACES.useQuizByIdOrSlug,
reason: CAPTURE_REASONS.isCorrectLeak,
        },
contexts: {
quizId,
optionId: option.optionId,
        },
      },
    );
  }
return {
optionId: option.optionId,
position: option.position,
value: option.value,
createdAt: option.createdAt,
  };
}

function projectQuestion(
question: RawQuestionAtBoundary,
quizId: string,
): PlayerQuestion {
const sortedOptions = [...question.answerOptions].sort(
(a, b) => a.position - b.position,
  );
return {
questionId: question.questionId,
quizVersionId: question.quizVersionId,
position: question.position,
questionText: question.questionText,
imageUrl: question.imageUrl ?? null,
answerOptions: sortedOptions.map((option) =>
projectOption(option, quizId),
    ),
  };
}

function projectPublishedVersion(
publishedVersion: RawPublishedVersionAtBoundary | null,
quizId: string,
): PlayerPublishedVersion | null {
if (!publishedVersion) {
return null;
  }
const rawQuestions = publishedVersion.questions ?? [];
const sortedQuestions = [...rawQuestions].sort(
(a, b) => a.position - b.position,
  );
return {
quizVersionId: publishedVersion.quizVersionId,
versionNumber: publishedVersion.versionNumber,
difficulty: publishedVersion.difficulty,
durationMs: publishedVersion.durationMs,
passingScorePercent: publishedVersion.passingScorePercent,
rewardXp: publishedVersion.rewardXp,
questions: sortedQuestions.map((question) =>
projectQuestion(question, quizId),
    ),
  };
}

export function projectQuizToPlayerView(
quiz: QuizResponseDto,
): PlayerQuizDetail {
const publishedVersion = projectPublishedVersion(
(quiz.publishedVersion ?? null) as RawPublishedVersionAtBoundary | null,
quiz.quizId,
  );

return {
quizId: quiz.quizId,
creatorId: quiz.creatorId ?? null,
title: quiz.title,
description: quiz.description ?? null,
slug: quiz.slug,
requirements: quiz.requirements ?? null,
imageUrl: quiz.imageUrl ?? null,
categoryId: quiz.categoryId ?? null,
isFeatured: quiz.isFeatured,
isHidden: quiz.isHidden,
isVerified: quiz.isVerified,
publishedVersionId: quiz.publishedVersionId ?? null,
publishedVersion,
tags: quiz.tags,
createdAt: quiz.createdAt,
updatedAt: quiz.updatedAt,
  };
}
