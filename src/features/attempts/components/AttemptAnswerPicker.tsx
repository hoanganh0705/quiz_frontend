'use client';

/**
 * `AttemptAnswerPicker` — accessible controlled answer picker for one
 * player question.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.13.
 *
 * ## What this component owns
 *
 * - Renders the verified answer control (radio for multiple-choice,
 *   radio pair for true/false) for one player question.
 * - Emits a controlled `onChange` event whose payload is the
 *   `AnswerSelection` (T-4.14.2) discriminated union.
 * - Respects the locked / pending / error props so the picker
 *   reflects the canonical runner state.
 * - Uses player option values (text) for display and the verified
 *   option id for the submitted payload identity.
 *
 * ## What this component does NOT own
 *
 * - No service, SWR, store, or router imports — the component is
 *   purely presentational.
 * - No validation — the validation adapter (T-4.14.3) is the
 *   single site that decides whether a selection is submittable.
 * - No correctness / score / completion display.
 *
 * ## Player DTO invariant
 *
 * The component accepts only player-safe types and refuses to
 * compile when given an author DTO. The `question` prop is typed
 * as `QuizQuestionPlayerDto` so an attempt to pass
 * `QuizQuestionDto` (author) is a compile-time error.
 */

import * as React from 'react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { cn } from '@/shared/utils/merge-class-names';

import { deriveQuestionKind } from '@/features/attempts/lib/attempt-answer-validation';
import type {
  AnswerSelection,
} from '@/features/attempts/types/attempt-runner.types';

import type {
  QuizQuestionPlayerDto,
} from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptAnswerPickerProps {
  /**
   * The player-safe question the picker renders. The component
   * derives the control variant from this DTO's `answerOptions`
   * cardinality.
   */
  question: QuizQuestionPlayerDto;
  /**
   * The current controlled selection, or `null` for an unanswered
   * question.
   */
  value: AnswerSelection | null;
  /**
   * Fired when the user changes the selection. The callback never
   * fires while the picker is locked or pending.
   */
  onChange: (selection: AnswerSelection) => void;
  /**
   * When `true`, the picker renders a locked affordance and emits
   * no `onChange`. Used when the runner has confirmed a server-side
   * submission for this question.
   */
  isLocked?: boolean;
  /**
   * When `true`, the picker is busy with a pending mutation. The
   * controls are disabled and emit no `onChange`.
   */
  isPending?: boolean;
  /**
   * Optional inline error to render under the controls. The error
   * is associated with the field via `aria-describedby` so screen
   * readers announce it.
   */
  errorMessage?: string | null;
  /**
   * Optional field id used by the test runner to attach data-testid
   * to the rendered controls.
   */
  testIdPrefix?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptAnswerPicker(
  props: AttemptAnswerPickerProps,
): React.ReactElement {
  const {
    question,
    value,
    onChange,
    isLocked = false,
    isPending = false,
    errorMessage = null,
    testIdPrefix,
  } = props;

  const kind = deriveQuestionKind(question);
  const disabled = isLocked || isPending;
  const errorId = React.useId();
  const groupId = React.useId();

  // True/false — derive the canonical option ids from the player DTO.
  if (kind === 'true_false') {
    const trueOption = question.answerOptions.find(
      (o) => typeof o.value === 'string' && o.value.toLowerCase() === 'true',
    );
    const falseOption = question.answerOptions.find(
      (o) => typeof o.value === 'string' && o.value.toLowerCase() === 'false',
    );

    if (!trueOption || !falseOption) {
      // The picker cannot render without the canonical option ids;
      // surface a defensive placeholder so the runner knows the
      // question cannot be answered.
      return (
        <p
          className="text-sm text-muted-foreground"
          data-testid={testIdPrefix ? `${testIdPrefix}-malformed` : undefined}
        >
          This question cannot be answered.
        </p>
      );
    }

    const currentValue =
      value?.kind === 'true_false' && value.questionId === question.questionId
        ? String(value.value)
        : '';

    return (
      <div
        className="space-y-2"
        data-testid={testIdPrefix ? `${testIdPrefix}-root` : undefined}
      >
        <RadioGroup
          id={groupId}
          value={currentValue}
          disabled={disabled}
          onValueChange={(next) => {
            if (disabled) return;
            const boolValue = next === 'true';
            onChange({
              kind: 'true_false',
              questionId: question.questionId,
              value: boolValue,
            });
          }}
          aria-describedby={errorMessage ? errorId : undefined}
          aria-invalid={errorMessage ? true : undefined}
        >
          {[trueOption, falseOption].map((option) => {
            const optionValue = option.value ?? '';
            return (
              <div
                key={option.optionId}
                className="flex items-center gap-2"
              >
                <RadioGroupItem
                  id={`${groupId}-${option.optionId}`}
                  value={optionValue}
                  data-testid={testIdPrefix ? `${testIdPrefix}-${option.optionId}` : undefined}
                />
                <Label htmlFor={`${groupId}-${option.optionId}`}>
                  {option.text}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        {errorMessage ? (
          <p
            id={errorId}
            className="text-sm text-destructive"
            role="alert"
            data-testid={testIdPrefix ? `${testIdPrefix}-error` : undefined}
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  // Multiple-choice — radio group over every option.
  const currentIds =
    value?.kind === 'multiple_choice' && value.questionId === question.questionId
      ? value.selectedOptionIds
      : [];

  return (
    <div
      className="space-y-2"
      data-testid={testIdPrefix ? `${testIdPrefix}-root` : undefined}
    >
      <RadioGroup
        id={groupId}
        value={currentIds[0] ?? ''}
        disabled={disabled}
        onValueChange={(next) => {
          if (disabled) return;
          onChange({
            kind: 'multiple_choice',
            questionId: question.questionId,
            selectedOptionIds: [next],
          });
        }}
        aria-describedby={errorMessage ? errorId : undefined}
        aria-invalid={errorMessage ? true : undefined}
      >
        {question.answerOptions.map((option) => (
          <div key={option.optionId} className="flex items-center gap-2">
            <RadioGroupItem
              id={`${groupId}-${option.optionId}`}
              value={option.optionId}
              data-testid={testIdPrefix ? `${testIdPrefix}-${option.optionId}` : undefined}
            />
            <Label htmlFor={`${groupId}-${option.optionId}`}>
              {option.text}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {errorMessage ? (
        <p
          id={errorId}
          className={cn('text-sm text-destructive')}
          role="alert"
          data-testid={testIdPrefix ? `${testIdPrefix}-error` : undefined}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

void Input;