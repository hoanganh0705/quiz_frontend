import type {
  ReviewResponseDto,
  ReviewDetailResponseDto,
} from "@/lib/api/generated/schemas";
import { getQueryClient } from "@/providers/QueryProvider";

export const REVIEWS_DEFAULT_LIMIT = 20;

export type ReviewDto = ReviewResponseDto & { id: string };

export type MyReviewDto = ReviewDetailResponseDto & { id: string };

export interface ReviewFilters {
  cursor?: string;
  limit?: number;
}

export interface ReviewPage {
  items: readonly ReviewDto[];

  nextCursor: string | null;

  hasNextPage: boolean;

  limit: number;
}

export type ReviewGateState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "existing-review"; review: MyReviewDto }
  | { kind: "eligible" }
  | { kind: "attempt-required" }
  | { kind: "error"; error: unknown };

export interface ReviewGateResult {
  state: ReviewGateState;

  isLoading: boolean;

  revalidate: () => Promise<void>;
}

export function quizReviewsKey(
  quizId: string,
  filters?: ReviewFilters,
): ["reviews", "quiz", string, ReadonlyArray<string | number | undefined>] {
  return [
    "reviews",
    "quiz",
    quizId,
    [filters?.cursor ?? undefined, filters?.limit ?? undefined],
  ];
}

export function myQuizReviewKey(
  quizId: string,
  sessionId: string,
): ["reviews", "my", string, string] {
  return ["reviews", "my", quizId, sessionId];
}

export function reviewQuizAttemptKey(
  quizId: string,
  sessionId: string,
): ["reviews", "eligibility", string, string] {
  return ["reviews", "eligibility", quizId, sessionId];
}

export interface InvalidateReviewCachesArgs {
  quizId: string;
  sessionId: string;
}

export async function invalidateReviewCaches(
  first: unknown,
  second?: InvalidateReviewCachesArgs,
): Promise<void> {
  const args = (
    second !== undefined ? second : first
  ) as InvalidateReviewCachesArgs;
  const { quizId, sessionId } = args;

  try {
    const qc = getQueryClient();
    await qc.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "reviews" &&
        query.queryKey[1] === "quiz" &&
        query.queryKey[2] === quizId,
    });
    await qc.invalidateQueries({ queryKey: myQuizReviewKey(quizId, sessionId) });
    await qc.invalidateQueries({
      queryKey: reviewQuizAttemptKey(quizId, sessionId),
    });
    await qc.invalidateQueries({ queryKey: ["reviews"] });
  } catch {}
}
