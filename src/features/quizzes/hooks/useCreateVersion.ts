

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';
import type { CreateQuizVersionDto } from '@/lib/api/generated/schemas';

import { createQuizVersion } from '@/features/quizzes/services/quizzes.service';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

export interface UseCreateVersionOptions {

onSuccess?: (result: QuizVersionSummary) => void;

onError?: (apiError: ApiError) => void;
}

export interface UseCreateVersionReturn {

createVersion: (quizId: string, payload: CreateQuizVersionDto) => Promise<QuizVersionSummary | null>;

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

export function useCreateVersion(
options: UseCreateVersionOptions = {},
): UseCreateVersionReturn {
const { onSuccess, onError } = options;

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);

const inFlightRef = useRef<Promise<QuizVersionSummary | null> | null>(null);

const createVersion = useCallback(
async (quizId: string, payload: CreateQuizVersionDto): Promise<QuizVersionSummary | null> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setIsLoading(true);
setError(null);
const startedAt = Date.now();

const core = (async (): Promise<QuizVersionSummary | null> => {
try {
const response = await createQuizVersion(quizId, payload);

const version = (response as unknown as { data?: QuizVersionSummary }).data;
if (!version) {
throw new Error('Unexpected response shape from POST /quizzes/:id/versions');
          }

emitBreadcrumb('phase4:4.9:create-version', {
status: 'success',
durationMs: Date.now() - startedAt,
          });

onSuccess?.(version);
return version;
        } catch (err) {
if (isApiError(err)) {
setError(err);
onError?.(err);

emitBreadcrumb('phase4:4.9:create-version', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
            });

throw err;
          }

emitBreadcrumb('phase4:4.9:create-version', {
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
[onSuccess, onError],
  );

const resetError = useCallback(() => {
setError(null);
  }, []);

return { createVersion, isLoading, error, resetError };
}
