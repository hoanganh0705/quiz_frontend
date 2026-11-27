import type {
  ReviewDetailResponseDto,
  ReviewResponseDto,
} from "@/lib/api/generated/schemas";

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
