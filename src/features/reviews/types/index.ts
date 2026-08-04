// Reviews types — Epic 4.13 + Epic 4.1

// Feature-level aliases and key factories (T-4.13.2).
export type {
  ReviewDto,
  MyReviewDto,
  ReviewFilters,
  ReviewPage,
  ReviewGateState,
  ReviewGateResult,
  InvalidateReviewCachesArgs,
} from './review.types';

export {
  REVIEWS_DEFAULT_LIMIT,
  quizReviewsKey,
  myQuizReviewKey,
  reviewQuizAttemptKey,
  invalidateReviewCaches,
} from './review.types';

// Re-export from generated SDK (pre-existing surface; locked for
// backward compatibility with the Story 4.1 service wrappers).
export type {
  ReviewResponseDto,
  ReviewListResponseDto,
  ReviewPaginationResponseDto,
  CreateReviewDto,
  UpdateReviewDto,
  CreateReviewResponseDto,
  UpdateReviewResponseDto,
} from '@/lib/api/generated/schemas';
