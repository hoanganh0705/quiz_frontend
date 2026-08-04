/**
 * `AttemptBreakdown.spec.tsx` — locks the per-question breakdown list.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.9.
 *
 * Coverage contract:
 *
 *   - Renders one row per question with the position, prompt, and
 *     correctness marker.
 *   - Renders the empty-state placeholder when the list is empty.
 *   - The correctness marker is derived from the verified server
 *     projection only (no client-side scoring).
 *   - The correct-option ids appear when the DTO exposes them.
 *   - The player-DTO invariant is preserved: no `isCorrect` /
 *     `correctAnswer` derivation runs locally.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  AttemptBreakdown,
  markerForQuestion,
} from '@/features/attempts/components/AttemptBreakdown';
import type { AttemptQuestionScoreDto } from '@/features/attempts/types/attempt-result.types';

afterEach(() => {
  cleanup();
});

function makeQuestion(
  overrides: Partial<AttemptQuestionScoreDto> = {},
): AttemptQuestionScoreDto {
  return {
    questionId: 'q-' + (overrides.questionId ?? 'unique'),
    position: 1,
    questionText: 'Pick the correct answer',
    imageUrl: null,
    selectedOptionId: 'opt-1',
    isCorrect: { value: true },
    timeTakenMs: null,
    answeredAt: '2026-01-01T12:00:00.000Z',
    answerOptions: [
      { optionId: 'opt-1', value: 'A', position: 1, isCorrect: true },
      { optionId: 'opt-2', value: 'B', position: 2, isCorrect: false },
    ],
    explanation: null,
    topicTags: null,
    difficulty: null,
    ...overrides,
  };
}

describe('AttemptBreakdown — projection', () => {
  it('renders one row per question with the canonical position', () => {
    const questions = [
      makeQuestion({ questionId: 'q1', position: 1 }),
      makeQuestion({ questionId: 'q2', position: 2 }),
    ];
    render(<AttemptBreakdown questions={questions} total={2} />);

    expect(screen.getByTestId('attempt-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('attempt-breakdown-row-q1')).toBeInTheDocument();
    expect(screen.getByTestId('attempt-breakdown-row-q2')).toBeInTheDocument();
    expect(screen.getByTestId('attempt-breakdown-row-q1-correct')).toHaveTextContent(
      'opt-1',
    );
  });

  it('renders the Correct / Incorrect / Skipped / Pending markers', () => {
    const questions = [
      makeQuestion({ questionId: 'q-correct', isCorrect: { value: true } }),
      makeQuestion({ questionId: 'q-incorrect', isCorrect: { value: false } }),
      makeQuestion({ questionId: 'q-skipped', selectedOptionId: null }),
      makeQuestion({ questionId: 'q-pending', isCorrect: null }),
    ];
    render(<AttemptBreakdown questions={questions} total={4} />);

    expect(
      screen.getByTestId('attempt-breakdown-marker-correct'),
    ).toHaveTextContent('Correct');
    expect(
      screen.getByTestId('attempt-breakdown-marker-incorrect'),
    ).toHaveTextContent('Incorrect');
    expect(
      screen.getByTestId('attempt-breakdown-marker-skipped'),
    ).toHaveTextContent('Skipped');
    expect(
      screen.getByTestId('attempt-breakdown-marker-pending'),
    ).toHaveTextContent('Pending');
  });

  it('renders the empty-state placeholder when the breakdown is empty', () => {
    render(<AttemptBreakdown questions={[]} total={0} />);
    expect(screen.getByTestId('attempt-breakdown-empty')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No questions yet' }),
    ).toBeInTheDocument();
  });

  it('surfaces every correct option id within the row', () => {
    const questions = [
      makeQuestion({
        questionId: 'q-multi',
        answerOptions: [
          { optionId: 'opt-1', value: 'A', position: 1, isCorrect: true },
          { optionId: 'opt-2', value: 'B', position: 2, isCorrect: true },
          { optionId: 'opt-3', value: 'C', position: 3, isCorrect: false },
        ],
        isCorrect: { value: true },
      }),
    ];
    render(<AttemptBreakdown questions={questions} total={1} />);
    expect(
      screen.getByTestId('attempt-breakdown-row-q-multi-correct'),
    ).toHaveTextContent('opt-1, opt-2');
  });
});

describe('markerForQuestion — pure derivation', () => {
  it('returns "pending" when isCorrect is null', () => {
    expect(markerForQuestion(makeQuestion({ isCorrect: null }))).toBe(
      'pending',
    );
  });

  it('returns "skipped" when the selectedOptionId is null', () => {
    expect(
      markerForQuestion(
        makeQuestion({ selectedOptionId: null, isCorrect: { value: false } }),
      ),
    ).toBe('skipped');
  });

  it('returns "correct" / "incorrect" based on the verified isCorrect projection', () => {
    expect(markerForQuestion(makeQuestion({ isCorrect: { value: true } }))).toBe(
      'correct',
    );
    expect(
      markerForQuestion(makeQuestion({ isCorrect: { value: false } })),
    ).toBe('incorrect');
  });
});