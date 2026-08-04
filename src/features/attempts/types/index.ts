// Attempts types — aligned with backend DTOs

// Re-export from generated SDK
export type {
  AttemptResponseDto,
  AttemptListResponseDto,
  AttemptPaginationResponseDto,
  StartAttemptDto,
  SubmitAnswerDto,
  SubmitAnswerResponseDto,
  CompleteAttemptResponseDto,
  AbandonAttemptResponseDto,
  AttemptSummaryResponseDto,
  AttemptAnswerItemDto,
  AttemptAnswersResponseDto,
  QuizQuestionPlayerDto,
  QuizAnswerOptionPlayerDto,
} from '@/lib/api/generated/schemas';

export type {
  AttemptControllerStartAttemptResult,
  AttemptControllerGetAttemptByIdResult,
  AttemptControllerSubmitAnswerResult,
  AttemptControllerAbandonAttemptResult,
  AttemptControllerCompleteAttemptResult,
  AttemptControllerListMyAttemptsResult,
  AttemptControllerGetAttemptAnswersResult,
  AttemptControllerWithdrawAnswerResult,
} from '@/lib/api/generated/attempts/attempts';

// Story 4.14 runner-only types (T-4.14.2).
export type {
  AttemptRunnerStatus,
  AttemptQuestionKind,
  AnswerSelection,
  AttemptMutationOutcome,
  SubmittedAnswersMap,
  RunnerQuestion,
  RunnerAnswerOption,
  ActiveAttemptView,
  AttemptHydrationView,
  VerifiedSubmitAnswerPayload,
} from './attempt-runner.types';

export {
  statusFromAttempt,
  statusFromAttemptSummary,
  ATTEMPT_CACHE_KEYS,
} from './attempt-runner.types';