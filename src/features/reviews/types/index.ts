// Reviews types — aligned with backend DTOs

// Re-export from generated SDK
export type {
  ReviewResponseDto,
  ReviewListResponseDto,
  ReviewPaginationResponseDto,
  CreateReviewDto,
  UpdateReviewDto,
  CreateReviewResponseDto,
  UpdateReviewResponseDto,
  DeleteReviewResponseDto,
} from '@/lib/api/generated/schemas';

export type {
  ReviewControllerCreateReviewResult,
  ReviewControllerListReviewsResult,
  ReviewControllerUpdateReviewResult,
  ReviewControllerDeleteReviewResult,
} from '@/lib/api/generated/reviews/reviews';
