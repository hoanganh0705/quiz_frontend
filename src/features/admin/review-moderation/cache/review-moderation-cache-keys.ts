

import { mutate as globalMutate, type ScopedMutator } from 'swr';

import {
reviewReportsKeyMatcher,
} from '../hooks/useReviewReports';
import { REVIEW_READ_KEY } from '../hooks/useReview';

export { reviewReportsKeyMatcher };

export function reviewKey(
reviewId: string,
): ['admin', 'review-moderation', 'review', string] {

return REVIEW_READ_KEY(reviewId) as ['admin', 'review-moderation', 'review', string];
}

export function publicReviewsKeyMatcher(key: unknown): boolean {
if (!Array.isArray(key)) return false;
if (key[0] !== 'reviews') return false;
const segment = key[1];
return (
segment === 'quiz' ||
segment === 'my' ||
segment === 'eligibility'
  );
}

export function invalidateReviewReportsList(
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
return (mutate(reviewReportsKeyMatcher) as unknown) as Promise<unknown[]>;
}

export function invalidateReviewById(
reviewId: string,
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
if (!reviewId || typeof reviewId !== 'string') {
return Promise.resolve([]);
  }
const promises: unknown[] = [];
promises.push(mutate(reviewKey(reviewId)));
promises.push(
(mutate(publicReviewsKeyMatcher) as unknown) as Promise<unknown[]>,
  );
return Promise.all(promises) as Promise<unknown[]>;
}
