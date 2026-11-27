import { ApiError, getAttempts, unwrapEnvelope } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";

import type {
  AttemptControllerListMyAttemptsParams,
  AttemptReviewResponseDto,
  AttemptSummaryResponseDto,
  CompleteAttemptResponseDto,
  StartAttemptDto,
  SubmitAnswerDto,
} from "@/lib/api/generated/schemas";
import type {
  AttemptControllerAbandonAttemptResult,
  AttemptControllerCompleteAttemptResult,
  AttemptControllerGetAttemptAnalyticsResult,
  AttemptControllerGetAttemptAnswersResult,
  AttemptControllerGetAttemptByIdResult,
  AttemptControllerGetAttemptReviewResult,
  AttemptControllerGetMyAttemptStatsResult,
  AttemptControllerListMyAttemptsResult,
  AttemptControllerStartAttemptResult,
  AttemptControllerSubmitAnswerResult,
  AttemptControllerWithdrawAnswerResult,
} from "@/lib/api/generated/attempts/attempts";

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
  const wire = await sdk.attemptControllerCompleteAttempt(attemptId);
  return unwrapEnvelope<CompleteAttemptResponseDto>(
    wire as { data?: CompleteAttemptResponseDto },
    "Complete-attempt response envelope was missing the data field",
  );
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

export async function getActiveAttempt(
  quizId: string,
): Promise<AttemptSummaryResponseDto | null> {
  const sdk = getAttempts();
  try {
    const wire = await sdk.attemptControllerListMyAttempts({
      quizId,
      status: "started",
      limit: 1,
    });
    const unwrapped = inspectEnvelope<
      AttemptSummaryResponseDto[] | { items?: AttemptSummaryResponseDto[] }
    >(wire);
    let items: AttemptSummaryResponseDto[] = [];
    if (unwrapped.kind === "envelope" && unwrapped.value) {
      if (Array.isArray(unwrapped.value)) {
        items = unwrapped.value;
      } else if (Array.isArray(unwrapped.value.items)) {
        items = unwrapped.value.items;
      }
    } else if (
      unwrapped.kind === "passthrough" &&
      unwrapped.value &&
      typeof unwrapped.value === "object" &&
      "items" in unwrapped.value &&
      Array.isArray((unwrapped.value as { items?: unknown }).items)
    ) {
      items = (unwrapped.value as { items: AttemptSummaryResponseDto[] }).items;
    }
    return items[0] ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getAttemptResult(
  attemptId: string,
): Promise<AttemptReviewResponseDto | null> {
  const sdk = getAttempts();
  try {
    const wire = await sdk.attemptControllerGetAttemptReview(attemptId);
    const unwrapped = inspectEnvelope<AttemptReviewResponseDto>(wire);
    return unwrapped.kind === "envelope" ? (unwrapped.value ?? null) : null;
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
