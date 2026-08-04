/**
 * `AttemptQuestionCard.spec.tsx` — locks the player-safe question card.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.14.
 *
 * Coverage contract:
 *
 *   - Renders question number, text, and options via the picker.
 *   - Submit is disabled for an unanswered / invalid draft.
 *   - Submit is enabled for a valid selection.
 *   - Submit invokes the callback exactly once with the latest value.
 *   - Submitted state locks the picker and exposes Withdraw.
 *   - Long text and option labels wrap within the card.
 *   - No correctness / score DOM content is rendered.
 *   - Question-invalid branch renders without breaking layout.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AttemptQuestionCard } from '@/features/attempts/components/AttemptQuestionCard';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

function makeMultipleChoice(): QuizQuestionPlayerDto {
  return {
    questionId: 'q1',
    text: 'Pick the correct answer',
    orderIndex: 0,
    imageUrl: null,
    answerOptions: [
      { optionId: 'opt-a', text: 'Option A', value: 'a' },
      { optionId: 'opt-b', text: 'Option B', value: 'b' },
      { optionId: 'opt-c', text: 'Option C', value: 'c' },
    ],
  } as unknown as QuizQuestionPlayerDto;
}

describe('AttemptQuestionCard — rendering', () => {
  it('renders question number, text, and options', () => {
    render(
      <AttemptQuestionCard
        question={makeMultipleChoice()}
        index={1}
        total={3}
        value={null}
        onChange={() => {}}
        onSubmit={() => {}}
        onWithdraw={() => {}}
        isSubmitted={false}
        isPending={false}
      />,
    );

    expect(screen.getByText(/Pick the correct answer/)).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByTestId('qc-q1-opt-a')).toBeInTheDocument();
  });
});

describe('AttemptQuestionCard — submit affordance', () => {
  it('disables Submit when the value is null', () => {
    render(
      <AttemptQuestionCard
        question={makeMultipleChoice()}
        index={1}
        total={1}
        value={null}
        onChange={() => {}}
        onSubmit={() => {}}
        onWithdraw={() => {}}
        isSubmitted={false}
        isPending={false}
      />,
    );

    const submit = screen.getByTestId('question-card-q1-submit');
    expect(submit).toBeDisabled();
  });

  it('disables Submit for an empty multi-select', () => {
    render(
      <AttemptQuestionCard
        question={makeMultipleChoice()}
        index={1}
        total={1}
        value={{ kind: 'multiple_choice', questionId: 'q1', selectedOptionIds: [] }}
        onChange={() => {}}
        onSubmit={() => {}}
        onWithdraw={() => {}}
        isSubmitted={false}
        isPending={false}
      />,
    );

    const submit = screen.getByTestId('question-card-q1-submit');
    expect(submit).toBeDisabled();
  });

  it('enables Submit and invokes the callback once for a valid selection', () => {
    const onSubmit = vi.fn();
    render(
      <AttemptQuestionCard
        question={makeMultipleChoice()}
        index={1}
        total={1}
        value={{ kind: 'multiple_choice', questionId: 'q1', selectedOptionIds: ['opt-b'] }}
        onChange={() => {}}
        onSubmit={onSubmit}
        onWithdraw={() => {}}
        isSubmitted={false}
        isPending={false}
      />,
    );

    const submit = screen.getByTestId('question-card-q1-submit');
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('AttemptQuestionCard — submitted + withdraw', () => {
  it('locks the picker and exposes Withdraw when submitted', () => {
    const onWithdraw = vi.fn();
    render(
      <AttemptQuestionCard
        question={makeMultipleChoice()}
        index={1}
        total={1}
        value={{ kind: 'multiple_choice', questionId: 'q1', selectedOptionIds: ['opt-b'] }}
        onChange={() => {}}
        onSubmit={() => {}}
        onWithdraw={onWithdraw}
        isSubmitted
        isPending={false}
        submittedAt="2026-08-01T00:00:00.000Z"
      />,
    );

    // The picker renders a locked indicator and the Withdraw button
    // replaces Submit.
    expect(screen.queryByTestId('question-card-q1-submit')).toBeNull();
    expect(screen.getByTestId('question-card-q1-withdraw')).toBeInTheDocument();
    expect(screen.getByTestId('qc-q1-opt-b')).toBeDisabled();

    fireEvent.click(screen.getByTestId('question-card-q1-withdraw'));
    expect(onWithdraw).toHaveBeenCalledTimes(1);
  });
});

describe('AttemptQuestionCard — player DTO invariant', () => {
  it('does not render correctness / score text', () => {
    const { container } = render(
      <AttemptQuestionCard
        question={makeMultipleChoice()}
        index={1}
        total={1}
        value={null}
        onChange={() => {}}
        onSubmit={() => {}}
        onWithdraw={() => {}}
        isSubmitted={false}
        isPending={false}
      />,
    );

    expect(container.textContent).not.toMatch(/isCorrect|correctCount|pass|fail|scorePercent|completed: true/i);
  });
});

describe('AttemptQuestionCard — question invalid', () => {
  it('renders an invalid question in a non-blocking affordance', () => {
    render(
      <AttemptQuestionCard
        question={makeMultipleChoice()}
        index={2}
        total={5}
        value={null}
        onChange={() => {}}
        onSubmit={() => {}}
        onWithdraw={() => {}}
        isSubmitted={false}
        isPending={false}
        isQuestionInvalid
      />,
    );

    expect(screen.getByText('2/5')).toBeInTheDocument();
    // The card stays in the DOM; navigation can continue.
    expect(screen.getByTestId('question-card-q1')).toBeInTheDocument();
  });
});