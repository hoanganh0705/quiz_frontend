

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

export type {
AttemptResultDto,
AttemptQuestionScoreDto,
AttemptScoreSummaryDto,
} from './attempt-result.types';
export {
scoreSummaryFromResult,
ATTEMPT_RESULT_CACHE_KEYS,
} from './attempt-result.types';

export type {
AttemptHistoryStatusFilter,
AttemptHistoryDateRange,
AttemptHistoryFilters,
AttemptHistoryPage,
AttemptHistoryRow,
} from './attempt-history.types';
export {
ATTEMPT_HISTORY_CACHE_KEYS,
serializeAttemptHistoryFilters,
} from './attempt-history.types';