

export interface CreateReviewDto {

rating: number;

comment?: string | null;

idempotencyKey?: string | null;
}
