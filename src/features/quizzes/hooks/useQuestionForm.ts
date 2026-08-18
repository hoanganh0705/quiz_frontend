

'use client';

import { useCallback } from 'react';

import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import {
useQuizForm,
type UseQuizFormOptions,
type UseQuizFormReturn,
type BulkError,
} from '@/lib/forms/useQuizForm';
import type { ApiError } from '@/lib/api';

import {
createQuestionSchema,
bulkQuestionsSchema,
type CreateQuestionFormValues,
type BulkQuestionRow,
} from '@/features/quizzes/validation/question-schemas';
import {
QUESTION_TYPE_VALUES,
type QuestionType,
} from '@/features/quizzes/types/author-dtos';

function getDefaultOptions(questionType: QuestionType): Array<{
id: string;
position: number;
value: string;
isCorrect: boolean;
}> {
switch (questionType) {
case 'true_false':
return [
{ id: crypto.randomUUID(), position: 1, value: 'True', isCorrect: false },
{ id: crypto.randomUUID(), position: 2, value: 'False', isCorrect: false },
      ];
case 'single_choice':
case 'multiple_choice':
default:
return [
{ id: crypto.randomUUID(), position: 1, value: '', isCorrect: false },
{ id: crypto.randomUUID(), position: 2, value: '', isCorrect: false },
      ];
case 'short_answer':
return []; // Short answer has no options
  }
}

export function getDefaultQuestionValues(
questionType: QuestionType = 'single_choice',
position: number = 1,
): CreateQuestionFormValues {
return {
questionText: '',
imageUrl: undefined,
questionType,
answerOptions: getDefaultOptions(questionType),
  };
}

export interface UseQuestionFormOptions
extends Pick<
UseQuizFormOptions<typeof createQuestionSchema>,
'submit' | 'bulkHandler' | 'mode'
  > {

initialQuestionType?: QuestionType;

initialPosition?: number;
}

export interface UseQuestionFormReturn
extends Omit<UseQuizFormReturn<typeof createQuestionSchema>, 'bulkError'> {

bulkError: BulkError[];

addOption: () => void;

removeOption: (index: number) => void;

updateOption: (index: number, updates: Partial<{
value: string;
isCorrect: boolean;
  }>) => void;

reorderOptions: (fromIndex: number, toIndex: number) => void;
}

export function useQuestionForm(
options: UseQuestionFormOptions = {},
): UseQuestionFormReturn {
const {
initialQuestionType = 'single_choice',
initialPosition = 1,
submit,
bulkHandler,
mode = 'single',
  } = options;

const quizFormOptions: UseQuizFormOptions<typeof createQuestionSchema> = {
schema: createQuestionSchema,
defaultValues: getDefaultQuestionValues(initialQuestionType, initialPosition),
mode,
submit: submit as UseQuizFormOptions<typeof createQuestionSchema>['submit'],
bulkHandler: bulkHandler as UseQuizFormOptions<typeof createQuestionSchema>['bulkHandler'],
  };

const quizFormReturn = useQuizForm(quizFormOptions);

const { form } = quizFormReturn;
const { setValue, watch } = form;

const addOption = useCallback(() => {
const currentOptions = watch('answerOptions') ?? [];
const newPosition = currentOptions.length + 1;

setValue('answerOptions', [
...currentOptions,
{
id: crypto.randomUUID(),
position: newPosition,
value: '',
isCorrect: false,
      },
    ], { shouldValidate: false });
  }, [setValue, watch]);

const removeOption = useCallback(
(index: number) => {
const currentOptions = watch('answerOptions') ?? [];
if (currentOptions.length <= 2) {

return;
      }

const newOptions = currentOptions.filter((_, i) => i !== index);

const reindexed = newOptions.map((opt, i) => ({
...opt,
position: i + 1,
      }));

setValue('answerOptions', reindexed, { shouldValidate: false });
    },
[setValue, watch],
  );

const updateOption = useCallback(
(index: number, updates: Partial<{ value: string; isCorrect: boolean }>) => {
const currentOptions = watch('answerOptions') ?? [];
const newOptions = [...currentOptions];

if (index >= 0 && index < newOptions.length) {
newOptions[index] = { ...newOptions[index]!, ...updates };
setValue('answerOptions', newOptions, { shouldValidate: false });
      }
    },
[setValue, watch],
  );

const reorderOptions = useCallback(
(fromIndex: number, toIndex: number) => {
const currentOptions = watch('answerOptions') ?? [];
const newOptions = [...currentOptions];

if (
fromIndex < 0 ||
fromIndex >= newOptions.length ||
toIndex < 0 ||
toIndex >= newOptions.length
      ) {
return;
      }

const [moved] = newOptions.splice(fromIndex, 1);
newOptions.splice(toIndex, 0, moved);

const reindexed = newOptions.map((opt, i) => ({
...opt,
position: i + 1,
      }));

setValue('answerOptions', reindexed, { shouldValidate: false });
    },
[setValue, watch],
  );

return {
...quizFormReturn,
addOption,
removeOption,
updateOption,
reorderOptions,
  };
}

export interface UseBulkQuestionFormOptions {

onSuccess?: (questions: BulkQuestionRow[]) => void;

onError?: (error: ApiError) => void;

rows?: BulkQuestionRow[];
}

export const ANSWER_OPTIONS_LIMITS = {
MIN: 2,
MAX: 6,
} as const;

export { QUESTION_TYPE_VALUES } from '@/features/quizzes/types/author-dtos';
