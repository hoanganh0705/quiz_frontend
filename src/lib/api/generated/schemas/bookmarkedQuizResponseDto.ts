

export interface BookmarkedQuizResponseDto {

bookmarkId: string;

quizId: string;

quizTitle: string;

quizSlug: string;

quizImageUrl?: string | null;

quizIsFeatured: boolean;

notes?: string | null;

bookmarkedAt: string;
}
