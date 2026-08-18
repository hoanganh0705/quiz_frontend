

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { QuizQuestionList } from '@/features/quizzes/components/QuizQuestionList';
import {
type PlayerQuestion,
projectQuizToPlayerView,
} from '@/features/quizzes/lib/quiz-player-view';

const { captureExceptionSpy } = vi.hoisted(() => ({
captureExceptionSpy: vi.fn(),
}));

vi.mock('@/lib/observability/sentry-capture', async () => {
const actual = await vi.importActual<
typeof import('@/lib/observability/sentry-capture')
  >('@/lib/observability/sentry-capture');
return {
...actual,
captureException: captureExceptionSpy,
  };
});

interface MaliciousOption {
optionId: string;
position: number;
value: string;
createdAt: string;
isCorrect: boolean;
}

interface MaliciousQuestion {
questionId: string;
quizVersionId: string;
position: number;
questionText: string;
imageUrl: null;
createdAt: string;
updatedAt: string;
answerOptions: MaliciousOption[];
}

interface MaliciousPublishedVersion {
quizVersionId: string;
versionNumber: number;
difficulty: 'easy';
durationMs: number;
passingScorePercent: number;
rewardXp: number;
questions: MaliciousQuestion[];
}

interface MaliciousQuiz {
quizId: string;
creatorId: null;
title: string;
description: null;
slug: string;
requirements: null;
imageUrl: null;
categoryId: null;
isFeatured: boolean;
isHidden: boolean;
isVerified: boolean;
publishedVersionId: string;
createdAt: string;
updatedAt: string;
publishedVersion: MaliciousPublishedVersion;
tags: never[];
}

function makeMaliciousQuiz(): MaliciousQuiz {
return {
quizId: 'quiz-leak-1',
creatorId: null,
title: 'Leaky Quiz',
description: null,
slug: 'leaky-quiz',
requirements: null,
imageUrl: null,
categoryId: null,
isFeatured: false,
isHidden: false,
isVerified: false,
publishedVersionId: 'ver-1',
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
publishedVersion: {
quizVersionId: 'ver-1',
versionNumber: 1,
difficulty: 'easy',
durationMs: 60_000,
passingScorePercent: 70,
rewardXp: 50,
questions: [
{
questionId: 'q-1',
quizVersionId: 'ver-1',
position: 1,
questionText: 'What is 1+1?',
imageUrl: null,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
answerOptions: [
{
optionId: 'opt-1',
position: 1,
value: '1',
createdAt: '2026-07-01T00:00:00.000Z',
isCorrect: false,
            },
{
optionId: 'opt-2',
position: 2,
value: '2',
createdAt: '2026-07-01T00:00:00.000Z',
isCorrect: true,
            },
          ],
        },
      ],
    },
tags: [],
  };
}

function makeSafeQuiz(): MaliciousQuiz {

const safe = JSON.parse(JSON.stringify(makeMaliciousQuiz())) as MaliciousQuiz;
for (const question of safe.publishedVersion.questions) {
for (const option of question.answerOptions) {
delete (option as { isCorrect?: boolean }).isCorrect;
    }
  }
return safe;
}

beforeEach(() => {
captureExceptionSpy.mockReset();
captureExceptionSpy.mockImplementation(() => undefined);
});

afterEach(() => {
cleanup();
});

describe('Defense in depth — no correctness leak through to the DOM', () => {
it('(D3 AC #1, #2) leaks are stripped and telemetry is emitted for every corrupted option', () => {
const malicious = makeMaliciousQuiz();

const projected = projectQuizToPlayerView(
malicious as unknown as Parameters<typeof projectQuizToPlayerView>[0],
    );

expect(captureExceptionSpy).toHaveBeenCalledTimes(2);

for (const call of captureExceptionSpy.mock.calls) {
const [, context] = call as [
unknown,
{
tags: { surface: string; reason: string };
contexts: { quizId: string; optionId: string };
        },
      ];
expect(context.tags.surface).toBe('useQuizByIdOrSlug');
expect(context.tags.reason).toBe('isCorrect-leak');
expect(context.contexts.quizId).toBe('quiz-leak-1');
expect(context.contexts.optionId).toMatch(/^opt-/);
    }

const projectedJson = JSON.stringify(projected);
expect(projectedJson).not.toContain('isCorrect');

const questions = projected.publishedVersion?.questions ?? [];
expect(questions.length).toBeGreaterThan(0);
const firstQuestion: PlayerQuestion | undefined = questions[0];
expect(firstQuestion).toBeDefined();

const { container } = render(
<QuizQuestionList questions={firstQuestion ? [firstQuestion] : []} />,
    );

const html = container.innerHTML;
expect(html).not.toContain('isCorrect');
expect(html).not.toContain('iscorrect');
expect(html.toLowerCase()).not.toContain('is-correct');
expect(html.toLowerCase()).not.toContain('correct');

expect(html).toContain('1');
expect(html).toContain('2');
  });

it('(D3 AC #4) emits no observability event for a normal safe payload', () => {
const safe = makeSafeQuiz();

const projected = projectQuizToPlayerView(
safe as unknown as Parameters<typeof projectQuizToPlayerView>[0],
    );

expect(captureExceptionSpy).not.toHaveBeenCalled();

expect(JSON.stringify(projected)).not.toContain('isCorrect');
  });
});

describe('Defense in depth — DOM surface audit', () => {
it('(D3 AC #3) renders no correctness key/value in container.innerHTML, visible text, attributes, or accessible names', () => {
const malicious = makeMaliciousQuiz();
const projected = projectQuizToPlayerView(
malicious as unknown as Parameters<typeof projectQuizToPlayerView>[0],
    );
const questions = projected.publishedVersion?.questions ?? [];

const { container } = render(
<QuizQuestionList
questions={questions.length > 0 ? questions : []}
      />,
    );

const html = container.innerHTML;
expect(html).not.toContain('isCorrect');

expect(container.textContent ?? '').not.toMatch(/isCorrect/i);
expect(container.textContent ?? '').not.toMatch(/correct/i);

const allElements = container.querySelectorAll('*');
allElements.forEach((el) => {
for (const attr of Array.from(el.attributes)) {
expect(attr.value).not.toMatch(/isCorrect/i);
expect(attr.value.toLowerCase()).not.toMatch(/correct/);
expect(attr.name.toLowerCase()).not.toMatch(/correct/);
      }
    });

const labelled = container.querySelectorAll(
'[aria-label], [aria-labelledby], [alt], label',
    );
labelled.forEach((el) => {
const labelText =
el.getAttribute('aria-label') ??
el.getAttribute('alt') ??
el.textContent ??
'';
expect(labelText).not.toMatch(/isCorrect/i);
expect(labelText.toLowerCase()).not.toMatch(/correct/);
    });

expect(captureExceptionSpy).toHaveBeenCalled();
  });
});
