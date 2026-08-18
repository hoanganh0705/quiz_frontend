

'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUsers } from '@/lib/api';

export interface QuizHistoryStatsData {
totalAttempts: number;
completedAttempts: number;
abandonedAttempts: number;
averageScore: number;
totalTimeSpentSeconds: number;
favoriteCategory: { categoryId: string; name: string } | null;
favoriteTag: { tagId: string; name: string } | null;
lastAttemptAt: string | null;
}

export interface UseQuizHistoryStatsReturn {
stats: QuizHistoryStatsData | null;
isLoading: boolean;
error: Error | null;
refresh: () => Promise<void>;
}

export function useQuizHistoryStats(): UseQuizHistoryStatsReturn {
const [stats, setStats] = useState<QuizHistoryStatsData | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(true);
const [error, setError] = useState<Error | null>(null);

const fetchStats = useCallback(async () => {
setIsLoading(true);
setError(null);
try {
const sdk = getUsers();
const response = await sdk.quizHistoryControllerGetMyQuizHistoryStats();
const data = (response as unknown as { data?: QuizHistoryStatsData }).data;
if (!data) {
throw new Error('Unexpected response shape from /users/me/quiz-history/stats');
      }
setStats(data);
    } catch (err) {
setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
setIsLoading(false);
    }
  }, []);

useEffect(() => {
void fetchStats();
  }, [fetchStats]);

return { stats, isLoading, error, refresh: fetchStats };
}
