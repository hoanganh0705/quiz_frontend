

'use client';

import { useMemo } from 'react';

import { ApiError, isApiError, useSingleWithRetry } from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';

import { getQuizVersionDetail } from '@/features/quizzes/services/quizzes.service';
import {
quizVersionKey,
type QuizVersionDetail,
} from '@/features/quizzes/types/quiz-version.types';

export interface UseQuizVersionResult {

data: QuizVersionDetail | null;

isLoading: boolean;

error: ApiError | null;

notFound: boolean;

isDraft: boolean;

isPublished: boolean;

retry: () => Promise<void>;
}

export function useQuizVersion(
quizId: string | null,
versionId: string | null,
): UseQuizVersionResult {
const key = useMemo(
() =>
quizId !== null && versionId !== null
? quizVersionKey(quizId, versionId)
: null,
[quizId, versionId],
  );

const fetcher = useMemo<SingleFetcher<QuizVersionDetail>>(
() => async ({ signal }) => {
if (!quizId || !versionId) {
throw new DOMException('quizId and versionId are required', 'AbortError');
      }

const startedAt = Date.now();

try {
const response = await getQuizVersionDetail(quizId, versionId);

emitBreadcrumb('phase4:4.9:version-detail', {
status: 'success',
durationMs: Date.now() - startedAt,
        });

const data = (response as unknown as { data?: QuizVersionDetail }).data;
if (!data) {
throw new Error('Unexpected response shape');
        }
return data;
      } catch (err) {
if (isApiError(err)) {
emitBreadcrumb('phase4:4.9:version-detail', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
          });
throw err;
        }
emitBreadcrumb('phase4:4.9:version-detail', {
status: 'error',
durationMs: Date.now() - startedAt,
code: 'GLOBAL_UNKNOWN',
        });
throw err;
      }
    },
[quizId, versionId],
  );

const swr = useSingleWithRetry<QuizVersionDetail>({
key,
fetcher,
  });

const isNotFoundError =
swr.error !== null && swr.error.status === 404;

return {
data: swr.data ?? null,
isLoading: swr.isLoading,
error: swr.error !== null && !isNotFoundError ? swr.error : null,
notFound: isNotFoundError,
isDraft: swr.data?.status === 'draft',
isPublished: swr.data?.status === 'published',
retry: swr.retry,
  };
}

function emitBreadcrumb(
category: string,
data: { status: string; durationMs: number; code?: string },
): void {

void category;
void data;
}
