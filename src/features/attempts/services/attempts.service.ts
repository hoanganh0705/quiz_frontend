

import { ApiError, getAttempts } from '@/lib/api';

import type {
StartAttemptDto,
SubmitAnswerDto,
AttemptSummaryResponseDto,
AttemptAnswersResponseDto,
CompleteAttemptResponseDto,
AttemptControllerListMyAttemptsParams,
AttemptReviewResponseDto,
} from '@/lib/api/generated/schemas';

import type {
AttemptControllerStartAttemptResult,
AttemptControllerGetAttemptByIdResult,
AttemptControllerSubmitAnswerResult,
AttemptControllerGetAttemptAnswersResult,
AttemptControllerWithdrawAnswerResult,
AttemptControllerAbandonAttemptResult,
AttemptControllerCompleteAttemptResult,
AttemptControllerListMyAttemptsResult,
AttemptControllerGetMyAttemptStatsResult,
AttemptControllerGetAttemptAnalyticsResult,
AttemptControllerGetAttemptReviewResult,
} from '@/lib/api/generated/attempts/attempts';

export type ListMyAttemptsParams = AttemptControllerListMyAttemptsParams;

export type AttemptDto = AttemptControllerGetAttemptByIdResult;

export type AttemptAnswersDto = AttemptControllerGetAttemptAnswersResult;

export type AbandonAttemptDto = AttemptControllerAbandonAttemptResult;

export type SubmitAnswerResultDto = AttemptControllerSubmitAnswerResult;

export type WithdrawAnswerResultDto = AttemptControllerWithdrawAnswerResult;

export async function startAttempt(quizId: string, payload: StartAttemptDto) {
const sdk = getAttempts();
return sdk.attemptControllerStartAttempt(quizId, payload);
}

export async function getAttempt(attemptId: string): Promise<AttemptDto> {
const sdk = getAttempts();
return sdk.attemptControllerGetAttemptById(attemptId);
}

export async function submitAnswer(
attemptId: string,
payload: SubmitAnswerDto,
): Promise<SubmitAnswerResultDto> {
const sdk = getAttempts();
return sdk.attemptControllerSubmitAnswer(attemptId, payload);
}

export async function withdrawAnswer(
attemptId: string,
questionId: string,
): Promise<WithdrawAnswerResultDto> {
const sdk = getAttempts();
return sdk.attemptControllerWithdrawAnswer(attemptId, questionId);
}

export async function abandonAttempt(
attemptId: string,
): Promise<AbandonAttemptDto> {
const sdk = getAttempts();
return sdk.attemptControllerAbandonAttempt(attemptId);
}

export async function completeAttempt(
attemptId: string,
): Promise<CompleteAttemptResponseDto> {
const sdk = getAttempts();

const wire = (await sdk.attemptControllerCompleteAttempt(
attemptId,
  )) as unknown as { data?: CompleteAttemptResponseDto };
if (!wire.data) {
throw new ApiError({
name: 'AxiosError',
message: 'complete_attempt_missing_envelope',
isAxiosError: true,
response: {
status: 500,
statusText: 'X',
data: {
type: 'https://api.quiz.local/problems/internal',
title: 'Internal',
status: 500,
detail: 'Complete-attempt response envelope was missing the data field',
instance: `/api/v1/attempts/${attemptId}/complete`,
extensions: {
code: 'GLOBAL_INTERNAL_ERROR',
requestId: 'req-missing',
          },
        },
headers: {},
config: undefined as never,
      },
toJSON: () => ({}),
    });
  }
return wire.data;
}

export async function listMyAttempts(params?: ListMyAttemptsParams) {
const sdk = getAttempts();
return sdk.attemptControllerListMyAttempts(params);
}

export async function getMyAttemptStats() {
const sdk = getAttempts();
return sdk.attemptControllerGetMyAttemptStats();
}

export async function getAttemptReview(attemptId: string) {
const sdk = getAttempts();
return sdk.attemptControllerGetAttemptReview(attemptId);
}

export async function getAttemptAnswers(
attemptId: string,
): Promise<AttemptAnswersDto> {
const sdk = getAttempts();
return sdk.attemptControllerGetAttemptAnswers(attemptId);
}

export async function getAttemptAnalytics(attemptId: string) {
const sdk = getAttempts();
return sdk.attemptControllerGetAttemptAnalytics(attemptId);
}

type ListMyAttemptsWireResponse = AttemptControllerListMyAttemptsResult & {
data?: AttemptSummaryResponseDto[];
};

export async function getActiveAttempt(
quizId: string,
): Promise<AttemptSummaryResponseDto | null> {
const sdk = getAttempts();
try {
const wire = (await sdk.attemptControllerListMyAttempts({
quizId,
status: 'started',
limit: 1,
    })) as unknown as ListMyAttemptsWireResponse;
const items = wire.data ?? [];
return items[0] ?? null;
  } catch (err) {
if (err instanceof ApiError && err.status === 404) {
return null;
    }
throw err;
  }
}

type GetAttemptReviewWireResponse = {
data?: AttemptReviewResponseDto;
};

export async function getAttemptResult(
attemptId: string,
): Promise<AttemptReviewResponseDto | null> {
const sdk = getAttempts();
try {
const wire = (await sdk.attemptControllerGetAttemptReview(
attemptId,
    )) as unknown as GetAttemptReviewWireResponse;
return wire.data ?? null;
  } catch (err) {
if (err instanceof ApiError && err.status === 404) {
return null;
    }
throw err;
  }
}

export type {
AttemptControllerStartAttemptResult,
AttemptControllerGetAttemptByIdResult,
AttemptControllerSubmitAnswerResult,
AttemptControllerGetAttemptAnswersResult,
AttemptControllerWithdrawAnswerResult,
AttemptControllerAbandonAttemptResult,
AttemptControllerCompleteAttemptResult,
AttemptControllerListMyAttemptsResult,
AttemptControllerGetMyAttemptStatsResult,
AttemptControllerGetAttemptAnalyticsResult,
AttemptControllerGetAttemptReviewResult,
};