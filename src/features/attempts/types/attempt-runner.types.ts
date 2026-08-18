

import type {
AttemptResponseDto,
AttemptAnswerItemDto,
AttemptSummaryResponseDto,
AttemptResponseDtoStatus,
QuizQuestionPlayerDto,
QuizAnswerOptionPlayerDto,
SubmitAnswerDto,
} from '@/lib/api/generated/schemas';

export type AttemptQuestionKind = 'multiple_choice' | 'true_false';

export type AnswerSelection =
| {
kind: 'multiple_choice';
questionId: string;
selectedOptionIds: readonly string[];
    }
  | {
kind: 'true_false';
questionId: string;

value: boolean;
    };

export type AttemptRunnerStatus =
| 'idle'
  | 'starting'
  | 'in_progress'
  | 'submitting'
  | 'completing'
  | 'abandoning'
  | 'completed'
  | 'abandoned'
  | 'error';

export type AttemptMutationOutcome =
| { kind: 'success'; attemptId: string }
  | { kind: 'invalid'; field: 'questionId' | 'selection'; reason: string }
  | { kind: 'retryable'; error: import('@/lib/api').ApiError }
  | { kind: 'terminal'; error: import('@/lib/api').ApiError };

export type SubmittedAnswersMap = Readonly<Record<string, AttemptAnswerItemDto>>;

export type RunnerQuestion = QuizQuestionPlayerDto & {
kind: AttemptQuestionKind;
};

export type RunnerAnswerOption = QuizAnswerOptionPlayerDto;

export function statusFromAttempt(
status: AttemptResponseDtoStatus,
): AttemptRunnerStatus {
switch (status) {
case 'started':
return 'in_progress';
case 'completed':
return 'completed';
case 'abandoned':
return 'abandoned';
  }
}

export function statusFromAttemptSummary(
summary: AttemptSummaryResponseDto,
): AttemptRunnerStatus {
return statusFromAttempt(summary.status);
}

export interface ActiveAttemptView {

attempt: AttemptSummaryResponseDto | null;

isLoading: boolean;

error: import('@/lib/api').ApiError | null;

retry: () => Promise<void>;
}

export interface AttemptHydrationView {
detail: AttemptResponseDto | null;
submittedAnswers: SubmittedAnswersMap;
isLoading: boolean;
hasResolved: boolean;
error: import('@/lib/api').ApiError | null;
refresh: () => Promise<void>;
}

export const ATTEMPT_CACHE_KEYS = {

active(quizId: string, sessionId: string) {
return ['attempts', 'active', sessionId, quizId] as const;
  },

detail(attemptId: string, sessionId: string) {
return ['attempts', 'detail', sessionId, attemptId] as const;
  },

answers(attemptId: string, sessionId: string) {
return ['attempts', 'answers', sessionId, attemptId] as const;
  },
} as const;

export type VerifiedSubmitAnswerPayload = SubmitAnswerDto;