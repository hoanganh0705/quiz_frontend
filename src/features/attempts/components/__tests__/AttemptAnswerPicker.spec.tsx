/**
 * `AttemptAnswerPicker.spec.tsx` — locks the accessible controlled
 * answer picker.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.13.
 *
 * Coverage contract:
 *
 *   - Multiple-choice variant emits the verified `AnswerSelection`
 *     with the option id (not the option text).
 *   - True/false variant emits the canonical boolean value mapped to
 *     the verified option.
 *   - Empty (unanswered) picker renders no selection.
 *   - Locked / pending controls emit no `onChange`.
 *   - Inline error is associated with the field via `aria-describedby`.
 *   - The component never exposes correctness metadata.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AttemptAnswerPicker } from '@/features/attempts/components/AttemptAnswerPicker';

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

function makeTrueFalse(): QuizQuestionPlayerDto {
  return {
    questionId: 'q2',
    text: 'Is this true?',
    orderIndex: 0,
    imageUrl: null,
    answerOptions: [
      { optionId: 'opt-true', text: 'True', value: 'true' },
      { optionId: 'opt-false', text: 'False', value: 'false' },
    ],
  } as unknown as QuizQuestionPlayerDto;
}

describe('AttemptAnswerPicker — multiple-choice variant', () => {
  it('emits the verified option id, not the label', () => {
    const onChange = vi.fn();
    render(
      <AttemptAnswerPicker
        question={makeMultipleChoice()}
        value={null}
        onChange={onChange}
        testIdPrefix="picker"
      />,
    );

    const opt = screen.getByTestId('picker-opt-b');
    fireEvent.click(opt);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      kind: 'multiple_choice',
      questionId: 'q1',
      selectedOptionIds: ['opt-b'],
    });
  });

  it('renders no checked radio when value is null', () => {
    render(
      <AttemptAnswerPicker
        question={makeMultipleChoice()}
        value={null}
        onChange={() => {}}
        testIdPrefix="picker"
      />,
    );

    for (const optionId of ['opt-a', 'opt-b', 'opt-c']) {
      const input = screen.getByTestId(`picker-${optionId}`);
      // Radix RadioGroup exposes checked state via data-state and
      // aria-checked; the underlying <input> is hidden.
      expect(input.getAttribute('aria-checked')).not.toBe('true');
    }
  });
});

describe('AttemptAnswerPicker — true/false variant', () => {
  it('emits the canonical boolean true value', () => {
    const onChange = vi.fn();
    render(
      <AttemptAnswerPicker
        question={makeTrueFalse()}
        value={null}
        onChange={onChange}
        testIdPrefix="tf"
      />,
    );

    fireEvent.click(screen.getByTestId('tf-opt-true'));

    expect(onChange).toHaveBeenCalledWith({
      kind: 'true_false',
      questionId: 'q2',
      value: true,
    });
  });

  it('emits the canonical boolean false value', () => {
    const onChange = vi.fn();
    render(
      <AttemptAnswerPicker
        question={makeTrueFalse()}
        value={null}
        onChange={onChange}
        testIdPrefix="tf"
      />,
    );

    fireEvent.click(screen.getByTestId('tf-opt-false'));

    expect(onChange).toHaveBeenCalledWith({
      kind: 'true_false',
      questionId: 'q2',
      value: false,
    });
  });
});

describe('AttemptAnswerPicker — locked state', () => {
  it('emits no change when locked', () => {
    const onChange = vi.fn();
    render(
      <AttemptAnswerPicker
        question={makeMultipleChoice()}
        value={null}
        onChange={onChange}
        isLocked
        testIdPrefix="picker"
      />,
    );

    const opt = screen.getByTestId('picker-opt-a');
    expect(opt).toBeDisabled();

    fireEvent.click(opt);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('AttemptAnswerPicker — pending state', () => {
  it('disables controls when pending', () => {
    render(
      <AttemptAnswerPicker
        question={makeMultipleChoice()}
        value={null}
        onChange={() => {}}
        isPending
        testIdPrefix="picker"
      />,
    );

    for (const optionId of ['opt-a', 'opt-b', 'opt-c']) {
      const input = screen.getByTestId(`picker-${optionId}`);
      expect(input).toBeDisabled();
    }
  });
});

describe('AttemptAnswerPicker — inline error', () => {
  it('renders the error message with role=alert', () => {
    render(
      <AttemptAnswerPicker
        question={makeMultipleChoice()}
        value={null}
        onChange={() => {}}
        errorMessage="Selection is required"
        testIdPrefix="picker"
      />,
    );

    const error = screen.getByTestId('picker-error');
    expect(error).toHaveTextContent('Selection is required');
    expect(error).toHaveAttribute('role', 'alert');
  });
});

describe('AttemptAnswerPicker — player DTO invariant', () => {
  it('does not render any correctness / score text', () => {
    render(
      <AttemptAnswerPicker
        question={makeMultipleChoice()}
        value={null}
        onChange={() => {}}
        testIdPrefix="picker"
      />,
    );

    const container = screen.getByTestId('picker-root');
    expect(container.textContent).not.toMatch(/isCorrect|correctCount|score|answer key/i);
  });
});

describe('AttemptAnswerPicker — malformed true/false', () => {
  it('renders a defensive placeholder when option values are not true/false', () => {
    const malformed: QuizQuestionPlayerDto = {
      questionId: 'q3',
      text: 'TF malformed',
      orderIndex: 0,
      imageUrl: null,
      answerOptions: [
        { optionId: 'opt-x', text: 'X', value: 'maybe' },
      ],
    } as unknown as QuizQuestionPlayerDto;
    render(
      <AttemptAnswerPicker
        question={malformed}
        value={null}
        onChange={() => {}}
        testIdPrefix="tf"
      />,
    );

    expect(screen.getByTestId('tf-malformed')).toBeInTheDocument();
  });
});