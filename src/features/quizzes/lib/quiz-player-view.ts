/**
 * Player-view projection for the quiz-detail endpoint.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.A3.
 *
 * The public detail endpoint is documented to return player-safe
 * questions (no `isCorrect` on answer options). The generated
 * `QuizVersionResponseDto.questions` field is, however, typed as
 * `QuizQuestionAuthorDto[] | null` — the author-view projection,
 * which DOES include `isCorrect`. We do not trust the SDK typing
 * at the response boundary; this module is the single seam that
 * normalizes the payload into a player-safe shape before any UI
 * consumes it.
 *
 * ## Responsibilities
 *
 * 1. Sort questions ascending by `position` (1-based).
 * 2. Sort options ascending by `position` (1-based).
 * 3. Strip any `isCorrect` key from raw option payloads.
 * 4. Emit a `captureException` event with `{ surface, reason, quizId }`
 *    when a leak is detected, so the no-spoiler invariant is
 *    enforced observably.
 * 5. Never mutate the input DTOs.
 * 6. Produce an empty `questions` array when the published version is
 *    missing or has no questions — do not synthesize author data.
 */

import type { QuizResponseDto } from '@/lib/api/generated/schemas/quizResponseDto';
import type { QuizAnswerOptionPlayerDto } from '@/lib/api/generated/schemas/quizAnswerOptionPlayerDto';
import {
  CAPTURE_REASONS,
  CAPTURE_SURFACES,
  captureException,
} from '@/lib/observability/sentry-capture';

/**
 * Player-safe answer option. Mirrors the generated
 * `QuizAnswerOptionPlayerDto` and explicitly has no `isCorrect`
 * member.
 */
export type PlayerAnswerOption = QuizAnswerOptionPlayerDto;

/**
 * Player-safe question. Mirrors the generated
 * `QuizQuestionPlayerDto`; the inner `answerOptions` array is the
 * player-safe projection.
 */
export interface PlayerQuestion {
  questionId: string;
  quizVersionId: string;
  position: number;
  questionText: string;
  imageUrl: string | null;
  answerOptions: PlayerAnswerOption[];
}

/**
 * Player-safe published version summary. The fields exposed here are
 * the subset the Story 3.6 detail UI needs to render header, metadata,
 * and question list affordances.
 */
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

/**
 * Player-safe projection of `QuizResponseDto`. The output type
 * intentionally has no `isCorrect` reference at any depth.
 */
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

/**
 * Raw answer option shape as it may arrive at the boundary. The
 * generated `QuizQuestionPlayerDto` does not declare `isCorrect`,
 * but the SDK typing for `QuizVersionResponseDto.questions` is
 * `QuizQuestionAuthorDto[]` — which does include `isCorrect`. Treat
 * the boundary as untrusted and inspect the raw object for the
 * forbidden key.
 */
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

/**
 * Project the unwrapped `QuizResponseDto` into a player-safe shape.
 *
 * The input is not mutated. The output is a deep copy with the
 * sort orders applied and any stray `isCorrect` keys removed. When
 * a leak is detected, exactly one `captureException` call is emitted
 * per corrupted option so the no-spoiler invariant is observable.
 */
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
