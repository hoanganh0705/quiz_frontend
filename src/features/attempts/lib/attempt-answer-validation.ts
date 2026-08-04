/**
 * `attempt-answer-validation.ts` — Story 4.14 answer validation
 * adapter.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.3.
 *
 * ## Purpose
 *
 * Convert the runner's controlled `AnswerSelection` (T-4.14.2) into
 * a verified `SubmitAnswerDto` payload (or a typed blocked result)
 * before the runner issues a network mutation. The adapter is a
 * pure function: it never touches the network and never inspects
 * any reactive state. Consumers (the picker submit handler and the
 * answer-submit mutation hook) call it once per attempt.
 *
 * ## Verified contract (deployed OpenAPI)
 *
 * The current backend `SubmitAnswerDto` accepts:
 *
 *   - `questionId: string` (required)
 *   - `selectedOptionId?: string | null` — exactly one option
 *     identifier per submit
 *   - `timeTakenMs?: number | null`
 *
 * It does NOT yet expose:
 *
 *   - A multi-select array (no `selectedOptionIds` field).
 *   - A free-text short-answer field (no `text` field).
 *
 * When the backend grows those fields the adapter is the single
 * site to widen: add a new `AnswerSelection` branch, validate, and
 * map. Today, multi-select and short-answer selections produce an
 * explicit blocked result — the adapter fails closed rather than
 * emit a partially-correct payload.
 *
 * ## Player DTO invariant (Story 4.10)
 *
 * `deriveQuestionKind` derives the runner question kind from the
 * verified player DTO (`QuizQuestionPlayerDto.answerOptions`):
 *
 *   - 0–2 options ⇒ `'true_false'` (the adapter expects a
 *     `value: boolean` and maps it to the option whose `value`
 *     matches `"true"` / `"false"` case-insensitively).
 *   - ≥3 options ⇒ `'multiple_choice'` (the adapter expects a
 *     `selectedOptionId` of exactly one of the option ids).
 *
 * The derivation NEVER inspects option count alone to bypass the
 * kind discriminator; the runner types (`AnswerSelection`) are
 * discriminated and the adapter refuses any cross-kind submission.
 */

import type {
  QuizQuestionPlayerDto,
  SubmitAnswerDto,
} from '@/lib/api/generated/schemas';

import type {
  AnswerSelection,
  AttemptQuestionKind,
} from '../types/attempt-runner.types';

/** Maximum supported length of a short-answer text value (1–500 chars). */
export const SHORT_ANSWER_MAX_LENGTH = 500;

/**
 * Derived runner question kind from the player DTO.
 *
 * See file header for the cardinality rule. Pure helper exported
 * separately so the picker UI can render the correct input without
 * re-deriving the kind on every render.
 */
export function deriveQuestionKind(
  question: Pick<QuizQuestionPlayerDto, 'answerOptions'>,
): AttemptQuestionKind {
  return question.answerOptions.length <= 2 ? 'true_false' : 'multiple_choice';
}

/**
 * Discriminated outcome of the validation adapter.
 *
 *   - `ok` — the verified `SubmitAnswerDto` payload is ready; the
 *     runner can issue the network mutation.
 *   - `invalid` — the picker input failed validation. The result
 *     identifies which answer-picker field is wrong and why so the
 *     UI can render an inline error in the right slot.
 *   - `blocked` — the question kind is unknown or unsupported by
 *     the current contract; the runner must NOT issue a mutation.
 */
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

/**
 * Normalise the verified true/false option identifiers for a question.
 *
 * The player DTO carries two options whose `value` is supposed to be
 * `"true"` / `"false"` (case-insensitive). This helper resolves the
 * canonical option identifier for each side so the adapter can map a
 * runner `value: boolean` to the verified option.
 *
 * Returns `null` when either side is missing — the adapter maps that
 * to a `blocked` outcome so the runner never issues a malformed
 * submit.
 */
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

/**
 * Validate the runner's controlled selection against the verified
 * player question and project it onto the verified `SubmitAnswerDto`.
 *
 * Pure function: returns a typed `AnswerValidationResult` and never
 * touches the network. The runner consults `result.kind` to decide
 * whether to issue the mutation, render an inline error, or block
 * the submit.
 *
 * @param question The player DTO the picker is rendering.
 * @param selection The runner's controlled selection for this question.
 * @param timeTakenMs Optional time-taken-ms projection; the adapter
 *                    forwards it verbatim when supplied.
 */
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

  // Dispatch on the selection's kind discriminator — never on
  // option count alone. A cross-kind selection (e.g. `multiple_choice`
  // selection against a 2-option true/false question) is blocked
  // because the runner's controlled input and the player's
  // discriminated union must agree.
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
    // The deployed SubmitAnswerDto accepts exactly one option id;
    // multi-select selections are blocked rather than coerced.
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

  // Exhaustive — the AnswerSelection union is closed.
  return {
    kind: 'blocked',
    reason: 'unknown-question-kind',
  };
}

/**
 * Validate a free-text short-answer value against the approved
 * 1–500 character rule.
 *
 * Used by the picker (and its spec) to gate the submit button. The
 * adapter does NOT map short-answer values into a network payload
 * because the deployed `SubmitAnswerDto` does not expose a text
 * field yet; the runner surfaces the validation result so the user
 * understands why the submit button is disabled.
 */
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