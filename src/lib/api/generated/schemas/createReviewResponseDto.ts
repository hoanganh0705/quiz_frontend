

export interface CreateReviewResponseDto {

reviewId: string;

quizId: string;

rating: number;

comment?: string | null;

createdAt: string;
}
