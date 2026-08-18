

export interface ReviewResponseDto {

reviewId: string;

quizId: string;

userId: string;

username: string;

userAvatarUrl?: string | null;

rating: number;

comment?: string | null;

createdAt: string;

updatedAt: string;

helpfulCount: number;
}
