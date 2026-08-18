

import type {
ReviewResponseDto,
ReviewDetailResponseDto,
} from '@/lib/api/generated/schemas';

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
| { kind: 'loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'existing-review'; review: MyReviewDto }
  | { kind: 'eligible' }
  | { kind: 'attempt-required' }
  | { kind: 'error'; error: unknown };

export interface ReviewGateResult {
state: ReviewGateState;

isLoading: boolean;

revalidate: () => Promise<void>;
}

export function quizReviewsKey(
quizId: string,
filters?: ReviewFilters,
): ['reviews', 'quiz', string, ReadonlyArray<string | number | undefined>] {
return [
'reviews',
'quiz',
quizId,
[filters?.cursor ?? undefined, filters?.limit ?? undefined],
  ];
}

export function myQuizReviewKey(
quizId: string,
sessionId: string,
): ['reviews', 'my', string, string] {
return ['reviews', 'my', quizId, sessionId];
}

export function reviewQuizAttemptKey(
quizId: string,
sessionId: string,
): ['reviews', 'eligibility', string, string] {
return ['reviews', 'eligibility', quizId, sessionId];
}

export interface InvalidateReviewCachesArgs {
quizId: string;
sessionId: string;
}

export async function invalidateReviewCaches(
mutate: (
key: readonly unknown[] | ((k: readonly unknown[]) => boolean),
data: unknown,
opts?: { revalidate?: boolean },
  ) => Promise<unknown>,
args: InvalidateReviewCachesArgs,
): Promise<void> {
const { quizId, sessionId } = args;

await mutate(
(k) =>
Array.isArray(k) &&
k[0] === 'reviews' &&
k[1] === 'quiz' &&
k[2] === quizId,
undefined,
{ revalidate: true },
  );

await mutate(myQuizReviewKey(quizId, sessionId), undefined, {
revalidate: true,
  });
await mutate(reviewQuizAttemptKey(quizId, sessionId), undefined, {
revalidate: true,
  });
}
