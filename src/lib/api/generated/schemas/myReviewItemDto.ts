

export interface MyReviewItemDto {

reviewId: string;

quizId: string;

quizTitle: string;

rating: number;

comment?: string | null;

createdAt: string;

updatedAt?: string | null;
}
