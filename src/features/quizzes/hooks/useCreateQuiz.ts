

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';
import type { CreateQuizDto } from '@/lib/api/generated/schemas';

import { createQuiz } from '@/features/quizzes/services/quizzes.service';
import type { QuizCreateFormValues } from '@/lib/forms';
import type {
CreateQuizSuccessResult,
SlugAvailabilityResult,
TagResolutionResult,
} from '@/features/quizzes/types/quiz-create-form.types';

export interface UseCreateQuizOptions {

onSuccess?: (result: CreateQuizSuccessResult) => void;

onError?: (apiError: ApiError) => void;
}

export interface UseCreateQuizReturn {

submit: (
values: QuizCreateFormValues,
options?: {

resolvedTagIds?: string[];

skipAcknowledgements?: boolean;
    },
  ) => Promise<CreateQuizSuccessResult | null>;

isSubmitting: boolean;

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

function buildPayload(
  values: QuizCreateFormValues,
  resolvedTagIds?: string[],
): CreateQuizDto {
  return {
    title: values.title,
    description: values.description ?? undefined,
    slug: values.slug ?? undefined,
    requirements: values.requirements ?? undefined,
    imagePublicId: values.imagePublicId ?? undefined,
    isFeatured: values.isFeatured ?? undefined,
    isHidden: values.isHidden ?? undefined,
    categoryId: values.categoryId ?? undefined,
    tagIds: resolvedTagIds ?? undefined,
    initialVersion: values.initialVersion,
  };
}

export function useCreateQuiz(
options: UseCreateQuizOptions = {},
): UseCreateQuizReturn {
const { onSuccess, onError } = options;

const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<ApiError | null>(null);

const inFlightRef = useRef<Promise<CreateQuizSuccessResult | null> | null>(null);

const submit = useCallback(
async (
values: QuizCreateFormValues,
opts?: {
resolvedTagIds?: string[];
skipAcknowledgements?: boolean;
      },
    ): Promise<CreateQuizSuccessResult | null> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

if (
!opts?.skipAcknowledgements &&
!values.acknowledgements
      ) {

return null;
      }

setIsSubmitting(true);
setError(null);
const startedAt = Date.now();

const core = (async (): Promise<CreateQuizSuccessResult | null> => {
try {
const payload = buildPayload(values, opts?.resolvedTagIds);
const response = await createQuiz(payload);

const quiz = (response as unknown as { data?: { quizId: string; slug: string } }).data;
if (!quiz?.quizId) {

throw new Error('Unexpected response shape from POST /quizzes');
          }

const result: CreateQuizSuccessResult = {
id: quiz.quizId,
slug: quiz.slug,
          };

onSuccess?.(result);

emitBreadcrumb('phase4:4.8:create-quiz', {
status: 'success',
durationMs: Date.now() - startedAt,
          });

return result;
        } catch (err) {
if (isApiError(err)) {
setError(err);
onError?.(err);

emitBreadcrumb('phase4:4.8:create-quiz', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
            });

throw err;
          }

const unknownErr = err instanceof Error ? err.message : 'Unknown error';
emitBreadcrumb('phase4:4.8:create-quiz', {
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
setIsSubmitting(false);
      }
    },
[onSuccess, onError],
  );

const resetError = useCallback(() => {
setError(null);
  }, []);

return { submit, isSubmitting, error, resetError };
}

export type { SlugAvailabilityResult, TagResolutionResult };
