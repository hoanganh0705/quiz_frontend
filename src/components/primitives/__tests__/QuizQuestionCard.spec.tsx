

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { QuizQuestionCard } from '@/features/quizzes/components/QuizQuestionCard';
import type {
PlayerAnswerOption,
PlayerQuestion,
} from '@/features/quizzes/lib/quiz-player-view';

function makeOption(
position: number,
value: string,
optionId: string,
): PlayerAnswerOption {
return {
optionId,
position,
value,
createdAt: '2026-07-01T00:00:00.000Z',
  };
}

function makeQuestion(
position: number,
options: PlayerAnswerOption[],
overrides: Partial<PlayerQuestion> = {},
): PlayerQuestion {
return {
questionId: `q-${position}`,
quizVersionId: 'ver-1',
position,
questionText: `Question text ${position}`,
imageUrl: null,
answerOptions: options,
...overrides,
  };
}

afterEach(() => {
cleanup();
});

describe('QuizQuestionCard — render', () => {
it('(D1 AC #2) renders the question text, position, and every option in normalized order', () => {
const options = [
makeOption(3, 'Option C', 'opt-c'),
makeOption(1, 'Option A', 'opt-a'),
makeOption(2, 'Option B', 'opt-b'),
    ];
const question = makeQuestion(2, options);

render(<QuizQuestionCard question={question} displayPosition={2} />);

expect(
screen.getByLabelText('Question 2'),
    ).toHaveTextContent('2');

expect(
screen.getByText('Question text 2'),
    ).toBeInTheDocument();

const list = screen.getByTestId('quiz-question-options');
const renderedOptions = list.querySelectorAll(
'[data-testid="quiz-question-option"]',
    );
expect(renderedOptions).toHaveLength(3);
expect(renderedOptions[0]).toHaveAttribute('data-option-id', 'opt-a');
expect(renderedOptions[1]).toHaveAttribute('data-option-id', 'opt-b');
expect(renderedOptions[2]).toHaveAttribute('data-option-id', 'opt-c');

expect(renderedOptions[0]).toHaveTextContent('Option A');
expect(renderedOptions[1]).toHaveTextContent('Option B');
expect(renderedOptions[2]).toHaveTextContent('Option C');
  });
});

describe('QuizQuestionCard — read-only', () => {
it('(D1 AC #3) renders no form controls and exposes no correctness indicators', () => {
const options = [
makeOption(1, 'Option A', 'opt-a'),
makeOption(2, 'Option B', 'opt-b'),
    ];
const question = makeQuestion(1, options);

const { container } = render(
<QuizQuestionCard question={question} displayPosition={1} />,
    );

expect(container.querySelectorAll('input').length).toBe(0);
expect(container.querySelectorAll('button').length).toBe(0);
expect(container.querySelectorAll('select').length).toBe(0);
expect(container.querySelectorAll('textarea').length).toBe(0);

expect(
container.querySelectorAll('[role="radio"], [role="checkbox"]').length,
    ).toBe(0);
  });
});

describe('QuizQuestionCard — image', () => {
it('(D1 AC #4) renders an explicit-dimension image with meaningful alt text when imageUrl is set', () => {
const question = makeQuestion(1, [makeOption(1, 'Option A', 'opt-a')], {
imageUrl: 'https://example.test/q1.jpg',
    });

const { container } = render(
<QuizQuestionCard question={question} displayPosition={1} />,
    );

const img = screen.getByRole('img', {
name: /image for question 1/i,
    });
expect(img).toHaveAttribute('src', 'https://example.test/q1.jpg');
expect(img).toHaveAttribute('loading', 'lazy');

const wrapper = img.parentElement;
expect(wrapper?.className).toMatch(/aspect-\[16\/9\]/);

expect(container.querySelector('img')).not.toBeNull();
  });

it('(D1 AC #4) renders no <img> when imageUrl is null', () => {
const question = makeQuestion(1, [makeOption(1, 'Option A', 'opt-a')], {
imageUrl: null,
    });

const { container } = render(
<QuizQuestionCard question={question} displayPosition={1} />,
    );

expect(container.querySelector('img')).toBeNull();
expect(
container.querySelectorAll('.aspect-\\[16\\/9\\]').length,
    ).toBe(0);
  });
});

describe('QuizQuestionCard — no-spoiler invariant', () => {
it('(D1 AC #5) renders no correctness key, label, or class name in the DOM', () => {
const options = [
makeOption(1, 'Option A', 'opt-a'),
makeOption(2, 'Option B', 'opt-b'),
    ];
const question = makeQuestion(1, options);

const { container } = render(
<QuizQuestionCard question={question} displayPosition={1} />,
    );

const html = container.innerHTML;
const lower = html.toLowerCase();

expect(lower).not.toContain('iscorrect');
expect(lower).not.toContain('is-correct');

expect(lower).not.toContain('correct');

expect(
Array.from(container.querySelectorAll('[class]')).every(
(el) => !el.className.toLowerCase().includes('correct'),
      ),
    ).toBe(true);

expect(
Array.from(container.querySelectorAll('*')).every((el) => {
for (const attr of Array.from(el.attributes)) {
if (attr.name.toLowerCase().includes('correct')) return false;
if (attr.value.toLowerCase().includes('iscorrect')) return false;
        }
return true;
      }),
    ).toBe(true);
  });
});
