

'use client';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { useBookmarkedQuizIds } from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';

export interface UseIsBookmarkedResult {

isBookmarked: boolean;

isLoading: boolean;
}

export function useIsBookmarked(quizId: string): UseIsBookmarkedResult {
const { isAuthenticated } = useAuthState();
const { quizIds, isLoading } = useBookmarkedQuizIds();

if (!isAuthenticated) {
return { isBookmarked: false, isLoading: false };
  }

if (isLoading) {
return { isBookmarked: false, isLoading: true };
  }

return {
isBookmarked: quizIds.has(quizId),
isLoading: false,
  };
}
