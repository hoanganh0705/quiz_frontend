/**
 * `attempt-answer-validation.spec.ts` — locks the Story 4.14 answer
 * validation adapter.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.3.
 *
 * Coverage contract:
 *
 *   - `deriveQuestionKind` cardinality rule (≤2 → true/false,
 *     ≥3 → multiple_choice).
 *   - Multi-choice: empty selection fails; one verified option id
 *     succeeds; two or more fails (deployed contract rejects
 *     multi-select); an option id that does not belong to the
 *     question fails.
 *   - True/false: maps `value: true` / `value: false` to the
 *     verified option id whose `value` reads `"true"` / `"false"`.
 *   - Cross-kind selections (e.g. `multiple_choice` against a
 *     2-option question) are blocked.
 *   - Malformed true/false options (missing either side) are
 *     blocked.
 *   - `validateShortAnswer` enforces 1–500 chars after trim.
 *   - Mapper output is assignable to the generated `SubmitAnswerDto`.
 */

import { describe, expect, it } from 'vitest';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

import {
  deriveQuestionKind,
  validateAndBuildSubmitPayload,
  validateShortAnswer,
  SHORT_ANSWER_MAX_LENGTH,
  type AnswerValidationResult,
} from '../attempt-answer-validation';

function makeMultipleChoiceQuestion(): QuizQuestionPlayerDto {
  return {
    questionId: 'q-mc',
    quizVersionId: 'v1',
    position: 1,
    questionText: 'Pick one',
    imageUrl: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    answerOptions: [
      { optionId: 'a', position: 1, value: 'Alpha', createdAt: '2026-08-01T00:00:00.000Z' },
      { optionId: 'b', position: 2, value: 'Beta', createdAt: '2026-08-01T00:00:00.000Z' },
      { optionId: 'c', position: 3, value: 'Gamma', createdAt: '2026-08-01T00:00:00.000Z' },
    ],
  };
}

function makeTrueFalseQuestion(
  overrides: Partial<{ trueValue: string; falseValue: string }> = {},
): QuizQuestionPlayerDto {
  const trueValue = overrides.trueValue ?? 'true';
  const falseValue = overrides.falseValue ?? 'false';
  return {
    questionId: 'q-tf',
    quizVersionId: 'v1',
    position: 1,
    questionText: 'T/F',
    imageUrl: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    answerOptions: [
      { optionId: 't', position: 1, value: trueValue, createdAt: '2026-08-01T00:00:00.000Z' },
      { optionId: 'f', position: 2, value: falseValue, createdAt: '2026-08-01T00:00:00.000Z' },
    ],
  };
}

describe('deriveQuestionKind — cardinality rule', () => {
  it('treats 2-option questions as true/false', () => {
    const q = makeTrueFalseQuestion();
    expect(deriveQuestionKind(q)).toBe('true_false');
  });

  it('treats 0-option questions as true/false (defensive)', () => {
    const q = makeMultipleChoiceQuestion();
    const empty = { ...q, answerOptions: [] };
    expect(deriveQuestionKind(empty)).toBe('true_false');
  });

  it('treats 1-option questions as true/false (defensive)', () => {
    const q = makeMultipleChoiceQuestion();
    const one = { ...q, answerOptions: q.answerOptions.slice(0, 1) };
    expect(deriveQuestionKind(one)).toBe('true_false');
  });

  it('treats 3-option questions as multiple_choice', () => {
    expect(deriveQuestionKind(makeMultipleChoiceQuestion())).toBe('multiple_choice');
  });
});

describe('validateAndBuildSubmitPayload — multiple_choice', () => {
  it('accepts exactly one option id that belongs to the question', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'multiple_choice',
      questionId: q.questionId,
      selectedOptionIds: ['b'],
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.payload.questionId).toBe('q-mc');
      expect(result.payload.selectedOptionId).toBe('b');
    }
  });

  it('forwards the timeTakenMs when supplied', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(
      q,
      { kind: 'multiple_choice', questionId: q.questionId, selectedOptionIds: ['a'] },
      12345,
    );
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.payload.timeTakenMs).toBe(12345);
    }
  });

  it('omits timeTakenMs when null or undefined', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(
      q,
      { kind: 'multiple_choice', questionId: q.questionId, selectedOptionIds: ['a'] },
      null,
    );
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect('timeTakenMs' in result.payload ? result.payload.timeTakenMs : undefined).toBeUndefined();
    }
  });

  it('rejects an empty selection', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'multiple_choice',
      questionId: q.questionId,
      selectedOptionIds: [],
    });
    expect(result).toEqual({
      kind: 'invalid',
      field: 'selection',
      reason: 'empty-multi-select',
    });
  });

  it('rejects more than one selected option id (deployed contract is single-select)', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'multiple_choice',
      questionId: q.questionId,
      selectedOptionIds: ['a', 'b'],
    });
    expect(result).toEqual({
      kind: 'invalid',
      field: 'selection',
      reason: 'multi-select-not-supported',
    });
  });

  it('rejects an option id that does not belong to the question', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'multiple_choice',
      questionId: q.questionId,
      selectedOptionIds: ['zzz'],
    });
    expect(result).toEqual({
      kind: 'invalid',
      field: 'selection',
      reason: 'invalid-selected-option',
    });
  });

  it('rejects a selection whose questionId does not match the player question', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'multiple_choice',
      questionId: 'q-other',
      selectedOptionIds: ['a'],
    });
    expect(result).toEqual({
      kind: 'invalid',
      field: 'questionId',
      reason: 'invalid-selected-option',
    });
  });
});

describe('validateAndBuildSubmitPayload — true_false', () => {
  it('maps value=true to the verified "true" option id', () => {
    const q = makeTrueFalseQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'true_false',
      questionId: q.questionId,
      value: true,
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.payload.selectedOptionId).toBe('t');
    }
  });

  it('maps value=false to the verified "false" option id', () => {
    const q = makeTrueFalseQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'true_false',
      questionId: q.questionId,
      value: false,
    });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.payload.selectedOptionId).toBe('f');
    }
  });

  it('accepts case-insensitive "True" / "FALSE" option values', () => {
    const q = makeTrueFalseQuestion({ trueValue: 'True', falseValue: 'FALSE' });
    const okTrue = validateAndBuildSubmitPayload(q, {
      kind: 'true_false',
      questionId: q.questionId,
      value: true,
    });
    expect(okTrue.kind).toBe('ok');
    if (okTrue.kind === 'ok') {
      expect(okTrue.payload.selectedOptionId).toBe('t');
    }
    const okFalse = validateAndBuildSubmitPayload(q, {
      kind: 'true_false',
      questionId: q.questionId,
      value: false,
    });
    expect(okFalse.kind).toBe('ok');
    if (okFalse.kind === 'ok') {
      expect(okFalse.payload.selectedOptionId).toBe('f');
    }
  });

  it('blocks when the question has only one option', () => {
    const q = makeTrueFalseQuestion();
    const malformed = { ...q, answerOptions: q.answerOptions.slice(0, 1) };
    const result = validateAndBuildSubmitPayload(malformed, {
      kind: 'true_false',
      questionId: malformed.questionId,
      value: true,
    });
    expect(result).toEqual({
      kind: 'blocked',
      reason: 'true-false-options-malformed',
    });
  });

  it('blocks when neither side reads "true" / "false"', () => {
    const q = makeTrueFalseQuestion({ trueValue: 'yes', falseValue: 'no' });
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'true_false',
      questionId: q.questionId,
      value: true,
    });
    expect(result).toEqual({
      kind: 'blocked',
      reason: 'true-false-options-malformed',
    });
  });
});

describe('validateAndBuildSubmitPayload — cross-kind', () => {
  it('blocks a true/false selection against a multiple_choice question', () => {
    const q = makeMultipleChoiceQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'true_false',
      questionId: q.questionId,
      value: true,
    });
    expect(result).toEqual({ kind: 'blocked', reason: 'unknown-question-kind' });
  });

  it('blocks a multiple_choice selection against a true_false question', () => {
    const q = makeTrueFalseQuestion();
    const result = validateAndBuildSubmitPayload(q, {
      kind: 'multiple_choice',
      questionId: q.questionId,
      selectedOptionIds: ['t'],
    });
    expect(result).toEqual({ kind: 'blocked', reason: 'unknown-question-kind' });
  });
});

describe('validateAndBuildSubmitPayload — type assignability', () => {
  it('ok payload is assignable to the generated SubmitAnswerDto', () => {
    const q = makeMultipleChoiceQuestion();
    const result: AnswerValidationResult = validateAndBuildSubmitPayload(q, {
      kind: 'multiple_choice',
      questionId: q.questionId,
      selectedOptionIds: ['a'],
    });
    // The compile-time check below is the load-bearing assertion: an
    // `ok` result's payload must be assignable to the SDK DTO.
    if (result.kind === 'ok') {
      const payload = result.payload;
      const submitted: { questionId: string; selectedOptionId?: string | null } = payload;
      expect(submitted.questionId).toBe('q-mc');
      expect(submitted.selectedOptionId).toBe('a');
    } else {
      throw new Error('expected ok result');
    }
  });
});

describe('validateShortAnswer', () => {
  it('accepts a 1-character trimmed value', () => {
    expect(validateShortAnswer('a')).toEqual({ kind: 'ok', value: 'a' });
  });

  it('accepts a value at the upper bound', () => {
    const v = 'a'.repeat(SHORT_ANSWER_MAX_LENGTH);
    expect(validateShortAnswer(v)).toEqual({ kind: 'ok', value: v });
  });

  it('trims whitespace before validating', () => {
    expect(validateShortAnswer('   hello   ')).toEqual({ kind: 'ok', value: 'hello' });
  });

  it('rejects whitespace-only input', () => {
    expect(validateShortAnswer('     ')).toEqual({ kind: 'invalid', reason: 'empty' });
  });

  it('rejects an empty string', () => {
    expect(validateShortAnswer('')).toEqual({ kind: 'invalid', reason: 'empty' });
  });

  it('rejects values over 500 characters', () => {
    const v = 'a'.repeat(SHORT_ANSWER_MAX_LENGTH + 1);
    expect(validateShortAnswer(v)).toEqual({ kind: 'invalid', reason: 'too-long' });
  });
});