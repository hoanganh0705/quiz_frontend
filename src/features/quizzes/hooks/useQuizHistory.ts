

'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUsers } from '@/lib/api';

import type { QuizHistoryEntry } from '@/features/quizzes/types';

export interface UseQuizHistoryFilters {
status?: 'started' | 'completed' | 'abandoned' | 'all';
fromDate?: string;
toDate?: string;
}

export interface UseQuizHistoryReturn {
entries: QuizHistoryEntry[];
isLoading: boolean;
error: Error | null;
hasMore: boolean;
loadMore: () => Promise<void>;
refresh: () => Promise<void>;
totalLoaded: number;
}

const DEFAULT_LIMIT = 20;

function mapEntry(row: {
id: string;
quizId: string;
quizTitle: string;
quizSlug: string;
status: 'passed' | 'failed' | 'abandoned' | 'in_progress';
score: number | null;
correctAnswers: number | null;
totalQuestions: number;
timeTaken: number | null;
xpEarned: number;
completedAt: string;
difficulty: string | null;
}): QuizHistoryEntry {
const difficulty =
row.difficulty === 'easy' || row.difficulty === 'Easy'
? 'Easy'
: row.difficulty === 'medium' || row.difficulty === 'Medium'
? 'Medium'
: row.difficulty === 'hard' || row.difficulty === 'Hard'
? 'Hard'
: 'Medium';

return {
id: row.id,
quizId: row.quizId,
quizTitle: row.quizTitle,
category: '',
categoryIcon: '',
difficulty,
score: row.score ?? 0,
totalQuestions: row.totalQuestions,
correctAnswers: row.correctAnswers ?? 0,
timeTaken: row.timeTaken ?? 0,
completedAt: row.completedAt,
status:
row.status === 'in_progress'
? 'failed'
: row.status,
activityType: row.status === 'abandoned' ? 'abandoned' : 'completed',
xpEarned: row.xpEarned,
tags: [],
  };
}

export function useQuizHistory(
filters: UseQuizHistoryFilters = {},
): UseQuizHistoryReturn {
const [entries, setEntries] = useState<QuizHistoryEntry[]>([]);
const [cursor, setCursor] = useState<string | null>(null);
const [hasMore, setHasMore] = useState<boolean>(true);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<Error | null>(null);

const fetchPage = useCallback(
async (nextCursor: string | null, append: boolean) => {
setIsLoading(true);
setError(null);
try {
const sdk = getUsers();
const response = await sdk.quizHistoryControllerListMyQuizHistory({
limit: DEFAULT_LIMIT,
cursor: nextCursor ?? undefined,
status:
filters.status && filters.status !== 'all'
? filters.status
: undefined,
fromDate: filters.fromDate,
toDate: filters.toDate,
        });

const data = (response as unknown as { data?: {
entries: Parameters<typeof mapEntry>[0][];
pagination: {
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
          };
        } }).data;

if (!data) {
throw new Error('Unexpected response shape from /users/me/quiz-history');
        }

const mapped = data.entries.map(mapEntry);
setEntries((prev) => (append ? [...prev, ...mapped] : mapped));
setCursor(data.pagination.nextCursor);
setHasMore(data.pagination.hasNextPage);
      } catch (err) {
setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
setIsLoading(false);
      }
    },
[filters.status, filters.fromDate, filters.toDate],
  );

useEffect(() => {
setEntries([]);
setCursor(null);
setHasMore(true);
void fetchPage(null, false);
  }, [fetchPage]);

const loadMore = useCallback(async () => {
if (!hasMore || isLoading) return;
await fetchPage(cursor, true);
  }, [cursor, hasMore, isLoading, fetchPage]);

const refresh = useCallback(async () => {
setEntries([]);
setCursor(null);
setHasMore(true);
await fetchPage(null, false);
  }, [fetchPage]);

return {
entries,
isLoading,
error,
hasMore,
loadMore,
refresh,
totalLoaded: entries.length,
  };
}
