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
} from '@/lib/api/generated/schemas';

export type {
  AttemptControllerStartAttemptResult,
  AttemptControllerGetAttemptByIdResult,
  AttemptControllerSubmitAnswerResult,
  AttemptControllerAbandonAttemptResult,
  AttemptControllerCompleteAttemptResult,
  AttemptControllerListMyAttemptsResult,
} from '@/lib/api/generated/attempts/attempts';
