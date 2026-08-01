/**
 * `QuizQuestionList.spec.tsx` — locks the D2 question-list
 * contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.D2.
 *
 * Five cases per the ticket AC #1–5:
 *
 *   (D2 AC #1) Non-empty input renders one `QuizQuestionCard`
 *   per question using stable question IDs as keys.
 *   (D2 AC #2) Visual numbering follows normalized `position`,
 *   not array index or ID.
 *   (D2 AC #3) Empty input renders `Quiz is being prepared` and
 *   a `mailto:support@quizhub.com` support link.
 *   (D2 AC #4) The empty state contains no start-attempt
 *   affordance.
 *   (D2 AC #5) The section has an accessible heading and list
 *   semantics.
 *
 * The file lives under `src/components/primitives/__tests__/` so
 * vitest's `jsdom` project picks it up.
 */

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
    // Pass deliberately non-sequential IDs and shuffled positions
    // to prove the list re-orders by `position` and not by
    // array index or ID sort.
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

    // Card order: position 1, 2, 3 → displayPosition 1, 2, 3.
    const cards = list.querySelectorAll(
      '[data-testid="quiz-question-card"]',
    );
    expect(cards[0]).toHaveAttribute('data-position', '1');
    expect(cards[1]).toHaveAttribute('data-position', '2');
    expect(cards[2]).toHaveAttribute('data-position', '3');

    // The IDs follow the input order — the list uses them as
    // keys (visible as data-question-id on the card).
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

    // The heading is referenced by aria-labelledby on the
    // section.
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

    // No "Start", "Begin", "Resume", "Continue" CTAs.
    const allButtons = container.querySelectorAll('button, a[role="button"]');
    allButtons.forEach((el) => {
      const text = (el.textContent ?? '').toLowerCase();
      expect(text).not.toMatch(/start|begin|resume|continue|take/i);
    });

    // The empty state must not contain any form control that
    // could be mistaken for an attempt entry point.
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
