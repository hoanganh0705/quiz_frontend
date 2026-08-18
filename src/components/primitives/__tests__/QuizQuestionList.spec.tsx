

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { QuizQuestionList } from '@/features/quizzes/components/QuizQuestionList';
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
questionId: string,
options: PlayerAnswerOption[] = [
makeOption(1, 'Option A', 'opt-a'),
makeOption(2, 'Option B', 'opt-b'),
  ],
): PlayerQuestion {
return {
questionId,
quizVersionId: 'ver-1',
position,
questionText: `Question text ${position}`,
imageUrl: null,
answerOptions: options,
  };
}

afterEach(() => {
cleanup();
});

describe('QuizQuestionList — non-empty', () => {
it('(D2 AC #1, #2) renders one card per question in normalized order with stable keys', () => {

const questions = [
makeQuestion(3, 'q-c'),
makeQuestion(1, 'q-a'),
makeQuestion(2, 'q-b'),
    ];

render(<QuizQuestionList questions={questions} />);

const list = screen.getByTestId('quiz-question-list-items');
expect(list.tagName.toLowerCase()).toBe('ol');

const items = list.querySelectorAll(
'[data-testid="quiz-question-list-item"]',
    );
expect(items).toHaveLength(3);

const cards = list.querySelectorAll(
'[data-testid="quiz-question-card"]',
    );
expect(cards[0]).toHaveAttribute('data-position', '1');
expect(cards[1]).toHaveAttribute('data-position', '2');
expect(cards[2]).toHaveAttribute('data-position', '3');

expect(cards[0]).toHaveAttribute('data-question-id', 'q-a');
expect(cards[1]).toHaveAttribute('data-question-id', 'q-b');
expect(cards[2]).toHaveAttribute('data-question-id', 'q-c');
  });

it('(D2 AC #5) renders an accessible heading and a labelled ordered list', () => {
render(
<QuizQuestionList
questions={[makeQuestion(1, 'q-a'), makeQuestion(2, 'q-b')]}
      />,
    );

const heading = screen.getByRole('heading', {
level: 2,
name: /questions/i,
    });
expect(heading).toBeInTheDocument();

const section = screen.getByTestId('quiz-question-list');
expect(section).toHaveAttribute(
'aria-labelledby',
heading.getAttribute('id') ?? '',
    );

const list = screen.getByTestId('quiz-question-list-items');
expect(list.tagName.toLowerCase()).toBe('ol');
expect(list).toHaveAttribute('aria-label');
expect(
list.getAttribute('aria-label') ?? '',
    ).toContain('Quiz questions');
  });
});

describe('QuizQuestionList — empty state', () => {
it('(D2 AC #3) renders the prepared-quiz copy and the documented support mail link', () => {
render(<QuizQuestionList questions={[]} />);

const empty = screen.getByTestId('quiz-question-list-empty');
expect(empty).toBeInTheDocument();

expect(
within(empty).getByText('Quiz is being prepared'),
    ).toBeInTheDocument();

const link = screen.getByTestId('quiz-question-list-support-link');
expect(link).toHaveAttribute('href', 'mailto:support@quizhub.com');
expect(link).toHaveTextContent(/support@quizhub\.com/);
  });

it('(D2 AC #4) renders no start-attempt affordance in the empty state', () => {
const { container } = render(<QuizQuestionList questions={[]} />);

const allButtons = container.querySelectorAll('button, a[role="button"]');
allButtons.forEach((el) => {
const text = (el.textContent ?? '').toLowerCase();
expect(text).not.toMatch(/start|begin|resume|continue|take/i);
    });

expect(container.querySelectorAll('input, select, textarea').length).toBe(0);
  });

it('(D2 AC #5) keeps the section heading and section semantics in the empty state', () => {
render(<QuizQuestionList questions={[]} />);

expect(
screen.getByRole('heading', { level: 2, name: /questions/i }),
    ).toBeInTheDocument();
expect(
screen.getByTestId('quiz-question-list'),
    ).toHaveAttribute('data-empty', 'true');
  });
});

describe('QuizQuestionList — no-spoiler invariant', () => {
it('does not leak correctness data into the rendered subtree', () => {
const questions = [makeQuestion(1, 'q-a'), makeQuestion(2, 'q-b')];

const { container } = render(
<QuizQuestionList questions={questions} />,
    );

const html = container.innerHTML.toLowerCase();
expect(html).not.toContain('iscorrect');
expect(html).not.toContain('is-correct');
expect(html).not.toContain('correct');
  });
});
