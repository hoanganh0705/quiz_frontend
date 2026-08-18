

import * as Sentry from '@sentry/nextjs';

import type { QuizAuthorQuestionDto } from '@/features/quizzes/types/author-dtos';

export class AuthorDtoInvariantError extends Error {
public readonly questionId: string | undefined;
public readonly optionId: string | undefined;

constructor(
message: string,
questionId?: string,
optionId?: string,
  ) {
super(message);
this.name = 'AuthorDtoInvariantError';
this.questionId = questionId;
this.optionId = optionId;
  }
}

function hasIsCorrectField(option: unknown): option is { isCorrect: boolean } {
return (
typeof option === 'object' &&
option !== null &&
'isCorrect' in option
  );
}

function isAuthorQuestion(question: unknown): question is QuizAuthorQuestionDto {
if (typeof question !== 'object' || question === null) {
return false;
  }

const q = question as Record<string, unknown>;

if (!Array.isArray(q.answerOptions)) {
return true; // No options means we can't check
  }

return q.answerOptions.every((opt) => hasIsCorrectField(opt));
}

export function assertAuthorQuestionDto(questions: QuizAuthorQuestionDto[]): void {
for (const question of questions) {
if (!question.answerOptions) continue;

for (const option of question.answerOptions) {
if (!hasIsCorrectField(option)) {

Sentry.captureException(
new AuthorDtoInvariantError(
'Author DTO invariant violation: isCorrect field missing from answer option',
question.questionId,
undefined,
          ),
{
tags: {
feature: 'question-editor',
invariant: 'author-dto',
            },
extra: {
questionId: question.questionId,
quizVersionId: question.quizVersionId,
position: question.position,
            },
          },
        );

throw new AuthorDtoInvariantError(
`Data integrity check failed: expected author DTO with isCorrect field (question: ${question.questionId})`,
question.questionId,
undefined,
        );
      }
    }
  }
}

export function isPlayerQuestion(question: unknown): boolean {
if (typeof question !== 'object' || question === null) {
return false;
  }

const q = question as Record<string, unknown>;

if (!Array.isArray(q.answerOptions)) {
return false;
  }

if (q.answerOptions.length > 0) {
return !q.answerOptions.every((opt) => hasIsCorrectField(opt));
  }

return false;
}
