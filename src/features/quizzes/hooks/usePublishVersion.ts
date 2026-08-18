

'use client';

import { useCallback, useRef, useState } from 'react';

import { useSWRConfig } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';

import { publishQuizVersion } from '@/features/quizzes/services/quizzes.service';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';
import {
quizAuthorKey,
quizVersionsKey,
} from '@/features/quizzes/types/quiz-version.types';

export interface UsePublishVersionOptions {

onSuccess?: (result: QuizVersionSummary) => void;

onError?: (apiError: ApiError) => void;
}

export interface UsePublishVersionReturn {

publishVersion: (quizId: string, versionId: string) => Promise<QuizVersionSummary | null>;

isLoading: boolean;

error: ApiError | null;

resetError: () => void;
}

function emitBreadcrumb(
_category: string,
_data: { status: string; durationMs: number; code?: string },
): void {

void _category;
void _data;
}

export function usePublishVersion(
options: UsePublishVersionOptions = {},
): UsePublishVersionReturn {
const { onSuccess, onError } = options;

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);

const inFlightRef = useRef<Promise<QuizVersionSummary | null> | null>(null);

const { mutate } = useSWRConfig();

const publishVersion = useCallback(
async (quizId: string, versionId: string): Promise<QuizVersionSummary | null> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setIsLoading(true);
setError(null);
const startedAt = Date.now();

const core = (async (): Promise<QuizVersionSummary | null> => {
try {
const response = await publishQuizVersion(quizId, versionId);

const version = (response as unknown as { data?: QuizVersionSummary }).data;
if (!version) {
throw new Error('Unexpected response shape from POST /quizzes/:id/versions/:versionId/publish');
          }

emitBreadcrumb('phase4:4.11:publish-version', {
status: 'success',
durationMs: Date.now() - startedAt,
          });

void mutate(quizVersionsKey(quizId));
void mutate(quizAuthorKey(quizId));

onSuccess?.(version);
return version;
        } catch (err) {
if (isApiError(err)) {
setError(err);
onError?.(err);

emitBreadcrumb('phase4:4.11:publish-version', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
            });

throw err;
          }

emitBreadcrumb('phase4:4.11:publish-version', {
status: 'error',
durationMs: Date.now() - startedAt,
code: 'GLOBAL_UNKNOWN',
          });
throw err;
        }
      })();

inFlightRef.current = core;

try {
return await core;
      } finally {
inFlightRef.current = null;
setIsLoading(false);
      }
    },
[mutate, onSuccess, onError],
  );

const resetError = useCallback(() => {
setError(null);
  }, []);

return { publishVersion, isLoading, error, resetError };
}
