

import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import type { ErrorCode } from '@/lib/api/error-codes';

export const QUESTION_EDITOR_USER_COPY: Partial<Record<ErrorCode, UserCopyEntry>> = {

QUIZ_VALIDATION_FAILED: {
title: 'Validation error',
body: 'Please check your answers and try again.',
toast: 'inline',
  },

QUIZ_QUESTION_POSITION_CONFLICT: {
title: 'Position taken',
body: 'A question already exists at this position. Choose a different position or renumber existing questions.',
toast: 'inline',
  },

QUIZ_ANSWER_OPTION_POSITION_CONFLICT: {
title: 'Option position taken',
body: 'An answer option already exists at this position. Choose a different position.',
toast: 'inline',
  },

QUIZ_MULTIPLE_CORRECT_OPTIONS: {
title: 'Too many correct answers',
body: 'This question type only allows one correct answer. Please uncheck the extra answers.',
toast: 'inline',
  },
};

export function getRateLimitCopy(seconds: number): UserCopyEntry {
return {
title: 'Too many requests',
body: `Please wait ${seconds} second${seconds === 1 ? '' : 's'} before trying again.`,
toast: 'inline',
  };
}

export const FIELD_ERROR_MESSAGES = {
questionText: {
required: 'Question text is required',
minLength: 'Question text must be at least 1 character',
maxLength: 'Question text cannot exceed 1000 characters',
  },
questionType: {
required: 'Please select a question type',
invalid: 'Invalid question type',
  },
answerOptions: {
required: 'At least 2 answer options are required',
minLength: 'At least 2 answer options are required',
maxLength: 'No more than 6 answer options are allowed',
noCorrect: 'Please mark the correct answer(s)',
tooManyCorrect: 'Only one answer can be correct for this question type',
  },
imageUrl: {
invalid: 'Please enter a valid image URL',
tooLarge: 'Image URL exceeds maximum length',
  },
position: {
required: 'Position is required',
min: 'Position must be at least 1',
  },
} as const;

export function getQuestionEditorCopy(code: string): UserCopyEntry {
if (code in QUESTION_EDITOR_USER_COPY) {
return QUESTION_EDITOR_USER_COPY[code as keyof typeof QUESTION_EDITOR_USER_COPY]!;
  }
return getUserCopy(code);
}
