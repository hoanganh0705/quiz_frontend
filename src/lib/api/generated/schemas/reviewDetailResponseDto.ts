

export interface ReviewDetailResponseDto {

reviewId: string;

quizId: string;

quizTitle: string;

userId: string;

username: string;

rating: number;

comment?: string | null;

createdAt: string;

updatedAt: string;

helpfulCount: number;
}
