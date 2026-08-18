

import type {
QuizQuestionPlayerDto,
SubmitAnswerDto,
} from '@/lib/api/generated/schemas';

import type {
AnswerSelection,
AttemptQuestionKind,
} from '../types/attempt-runner.types';

export const SHORT_ANSWER_MAX_LENGTH = 500;

export function deriveQuestionKind(
question: Pick<QuizQuestionPlayerDto, 'answerOptions'>,
): AttemptQuestionKind {
return question.answerOptions.length <= 2 ? 'true_false' : 'multiple_choice';
}

export type AnswerValidationResult =
| { kind: 'ok'; payload: SubmitAnswerDto }
  | {
kind: 'invalid';
field: 'questionId' | 'selection';
reason:
| 'multi-select-not-supported'
        | 'empty-multi-select'
        | 'true-false-requires-boolean'
        | 'invalid-selected-option'
        | 'short-answer-out-of-range';
    }
  | {
kind: 'blocked';
reason:
| 'unknown-question-kind'
        | 'true-false-options-malformed'
        | 'question-has-no-options';
    };

function resolveTrueFalseOptions(
question: Pick<QuizQuestionPlayerDto, 'answerOptions'>,
): { trueOptionId: string; falseOptionId: string } | null {
const opts = question.answerOptions;
const trueOption = opts.find(
(o) => typeof o.value === 'string' && o.value.toLowerCase() === 'true',
  );
const falseOption = opts.find(
(o) => typeof o.value === 'string' && o.value.toLowerCase() === 'false',
  );
if (!trueOption || !falseOption) return null;
return { trueOptionId: trueOption.optionId, falseOptionId: falseOption.optionId };
}

export function validateAndBuildSubmitPayload(
question: QuizQuestionPlayerDto,
selection: AnswerSelection,
timeTakenMs?: number | null,
): AnswerValidationResult {
if (!question.questionId || question.questionId !== selection.questionId) {
return {
kind: 'invalid',
field: 'questionId',
reason: 'invalid-selected-option',
    };
  }

const kind = deriveQuestionKind(question);

if (selection.kind === 'true_false') {
if (kind !== 'true_false') {
return {
kind: 'blocked',
reason: 'unknown-question-kind',
      };
    }
const opts = resolveTrueFalseOptions(question);
if (opts === null) {
return {
kind: 'blocked',
reason: 'true-false-options-malformed',
      };
    }
return {
kind: 'ok',
payload: {
questionId: question.questionId,
selectedOptionId: selection.value ? opts.trueOptionId : opts.falseOptionId,
...(timeTakenMs === undefined || timeTakenMs === null
? {}
: { timeTakenMs }),
      },
    };
  }

if (selection.kind === 'multiple_choice') {
if (kind !== 'multiple_choice') {
return {
kind: 'blocked',
reason: 'unknown-question-kind',
      };
    }
if (selection.selectedOptionIds.length === 0) {
return {
kind: 'invalid',
field: 'selection',
reason: 'empty-multi-select',
      };
    }

if (selection.selectedOptionIds.length > 1) {
return {
kind: 'invalid',
field: 'selection',
reason: 'multi-select-not-supported',
      };
    }
const chosen = selection.selectedOptionIds[0]!;
const belongsToQuestion = question.answerOptions.some(
(o) => o.optionId === chosen,
    );
if (!belongsToQuestion) {
return {
kind: 'invalid',
field: 'selection',
reason: 'invalid-selected-option',
      };
    }
return {
kind: 'ok',
payload: {
questionId: question.questionId,
selectedOptionId: chosen,
...(timeTakenMs === undefined || timeTakenMs === null
? {}
: { timeTakenMs }),
      },
    };
  }

return {
kind: 'blocked',
reason: 'unknown-question-kind',
  };
}

export function validateShortAnswer(
value: string,
):
| { kind: 'ok'; value: string }
  | { kind: 'invalid'; reason: 'empty' | 'too-long' } {
const trimmed = value.trim();
if (trimmed.length === 0) {
return { kind: 'invalid', reason: 'empty' };
  }
if (trimmed.length > SHORT_ANSWER_MAX_LENGTH) {
return { kind: 'invalid', reason: 'too-long' };
  }
return { kind: 'ok', value: trimmed };
}