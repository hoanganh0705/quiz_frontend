/**
 * `SingleQuestionForm` — single question creation form.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.16.
 *
 * ## What this component owns
 *
 * - **Question text input** — textarea with character counter.
 * - **Image upload** — optional image with preview.
 * - **Question type select** — uses `<QuestionTypeSelect />`.
 * - **Answer options** — uses `<AnswerOptionsEditor />`.
 * - **Submit handling** — with loading, error, and success states.
 * - **429 cooldown** — disables submit during rate limit cooldown
 *   (driven by the `useCreateVersionQuestion` hook which owns the
 *   Retry-After countdown).
 *
 * ## Validation
 *
 * - Client-side: `react-hook-form` + `zodResolver(createQuestionSchema)`
 *   runs first; failed validation surfaces inline.
 * - Server-side: on `422`, per-field errors are mirrored via
 *   `setError(field.path, { message })` so the same UI path lights up.
 *
 * @see `QuestionTypeSelect` — question type selector
 * @see `AnswerOptionsEditor` — answer options editor
 * @see `useCreateVersionQuestion` — mutation hook
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import {
  createQuestionSchema,
  type CreateQuestionFormValues,
} from '@/features/quizzes/validation/question-schemas';
import {
  useCreateVersionQuestion,
} from '@/features/quizzes/hooks';
import {
  type QuestionType,
} from '@/features/quizzes/types/author-dtos';

import { QuestionTypeSelect } from './QuestionTypeSelect';
import { AnswerOptionsEditor, type AnswerOption } from './AnswerOptionsEditor';

// ─── Constants ───────────────────────────────────────────────────────────────

const TEXT_MAX_LENGTH = 1000;
const IMAGE_MAX_LENGTH = 2048;

// ─── Props ─────────────────────────────────────────────────────────────────

export interface SingleQuestionFormProps {
  /** Quiz UUID. */
  quizId: string;
  /** Quiz version UUID. */
  versionId: string;
  /** Version number for display. */
  versionNumber: number;
  /** Current question count (for position suggestion). */
  questionCount: number;
  /** Whether the form is disabled. */
  isDraft: boolean;
  /** Callback when question is created. */
  onSuccess: () => void;
  /** Callback when an error occurs. */
  onError: (error: { code: string; message: string }) => void;
}

// ─── Default options generator ───────────────────────────────────────────────

function getDefaultOptions(questionType: QuestionType): AnswerOption[] {
  switch (questionType) {
    case 'true_false':
      return [
        { id: 'true', position: 1, value: 'True', isCorrect: false },
        { id: 'false', position: 2, value: 'False', isCorrect: false },
      ];
    case 'single_choice':
    case 'multiple_choice':
    default:
      return [
        { id: crypto.randomUUID(), position: 1, value: '', isCorrect: false },
        { id: crypto.randomUUID(), position: 2, value: '', isCorrect: false },
      ];
    case 'short_answer':
      return [];
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * `<SingleQuestionForm />` — single question creation form.
 */
export const SingleQuestionForm = memo(function SingleQuestionForm({
  quizId,
  versionId,
  versionNumber,
  questionCount,
  isDraft,
  onSuccess,
  onError,
}: SingleQuestionFormProps): React.ReactElement {
  // ── Form state ────────────────────────────────────────────────────────

  const [questionType, setQuestionType] = useState<QuestionType>('single_choice');
  const [options, setOptions] = useState<AnswerOption[]>(
    getDefaultOptions('single_choice'),
  );
  const [localOptionsError, setLocalOptionsError] = useState<string | null>(null);

  // react-hook-form for question text + image URL only. Answer options
  // are managed by the AnswerOptionsEditor + zod refine.
  const form = useForm<CreateQuestionFormValues>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: {
      questionText: '',
      imageUrl: '',
      questionType: 'single_choice',
      answerOptions: options,
    },
    mode: 'onBlur',
  });
  const {
    register,
    formState: { errors },
    setError,
    reset,
  } = form;

  // ── Cooldown state (mirrors hook) ──────────────────────────────────────
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (cooldownSeconds === null) return;

    if (cooldownSeconds <= 0) {
      setCooldownSeconds(null);
      return;
    }

    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  // ── Backend mutation ──────────────────────────────────────────────────
  const {
    createQuestion,
    isSubmitting,
    error: hookError,
    fieldErrors,
    cooldownSeconds: hookCooldownSeconds,
  } = useCreateVersionQuestion({
    onSuccess: () => {
      reset({ questionText: '', imageUrl: '', questionType, answerOptions: options });
      setOptions(getDefaultOptions(questionType));
      onSuccess();
    },
    onError: (err) => {
      onError({ code: err.code, message: err.message });
    },
    onRateLimit: (seconds) => {
      setCooldownSeconds(seconds);
    },
  });

  // Mirror hook cooldown → local countdown display
  useEffect(() => {
    if (hookCooldownSeconds !== null) setCooldownSeconds(hookCooldownSeconds);
  }, [hookCooldownSeconds]);

  // Surface per-field errors from the backend (422) into react-hook-form
  // so the existing error UI paths render them.
  useEffect(() => {
    Object.entries(fieldErrors).forEach(([field, message]) => {
      if (field === '_general') return;
      if (field in ({} as CreateQuestionFormValues)) {
        setError(field as keyof CreateQuestionFormValues, { message });
      }
    });
  }, [fieldErrors, setError]);

  // ── Submit handler ────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const text = form.getValues('questionText') ?? '';
    if (!text.trim()) {
      setError('questionText', { message: 'Question text is required' });
      return;
    }

    // Validate options (not for short_answer)
    if (questionType !== 'short_answer') {
      if (options.length < 2) {
        setLocalOptionsError('At least 2 answer options are required');
        return;
      }
      const emptyOptions = options.filter((o) => !o.value.trim());
      if (emptyOptions.length > 0) {
        setLocalOptionsError('All answer options must have text');
        return;
      }
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (questionType === 'single_choice' || questionType === 'true_false') {
        if (correctCount !== 1) {
          setLocalOptionsError('Please mark exactly 1 correct answer');
          return;
        }
      } else if (questionType === 'multiple_choice') {
        if (correctCount < 1) {
          setLocalOptionsError('Please mark at least 1 correct answer');
          return;
        }
      }
    }
    setLocalOptionsError(null);

    // Build payload
    const position = questionCount + 1;
    const payload = {
      position,
      questionText: text.trim(),
      imageUrl: (form.getValues('imageUrl') ?? '').trim() || undefined,
      answerOptions: options.map((opt, idx) => ({
        position: idx + 1,
        value: opt.value.trim(),
        isCorrect: opt.isCorrect,
      })),
    };

    try {
      await createQuestion(quizId, versionId, payload);
    } catch {
      // Error already surfaced via hookError/onError; prevent unhandled
      // promise rejection from bubbling into the form.
    }
  }, [createQuestion, form, options, questionCount, questionType, quizId, setError, versionId]);

  // ── Question type change handler ──────────────────────────────────────

  const handleQuestionTypeChange = useCallback((newType: QuestionType) => {
    setQuestionType(newType);
    setOptions(getDefaultOptions(newType));
    setLocalOptionsError(null);
  }, []);

  // ── Options change handler ─────────────────────────────────────────────

  const handleOptionsChange = useCallback((newOptions: AnswerOption[]) => {
    setOptions(newOptions);
    setLocalOptionsError(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  const isSubmitDisabled =
    !isDraft || cooldownSeconds !== null || isSubmitting;
  const submitLabel = isSubmitting
    ? 'Adding...'
    : cooldownSeconds !== null
    ? `Wait ${cooldownSeconds}s`
    : 'Add Question';

  const questionTextError = errors.questionText?.message;
  const imageUrlError = errors.imageUrl?.message;

  return (
    <div
      className="rounded-lg border bg-card p-6"
      data-testid="single-question-form"
    >
      <h3 className="mb-6 text-lg font-semibold">
        Add a question to Version {versionNumber}
      </h3>

      <div className="space-y-6">
        {/* Question text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="question-text" className="required">
              Question text
            </Label>
            <span className="text-xs text-muted-foreground">
              {(form.watch('questionText') ?? '').length}/{TEXT_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="question-text"
            maxLength={TEXT_MAX_LENGTH}
            rows={3}
            disabled={isSubmitDisabled}
            placeholder="Enter your question..."
            className={questionTextError ? 'border-destructive' : ''}
            aria-invalid={!!questionTextError}
            aria-describedby={questionTextError ? 'question-text-error' : undefined}
            {...register('questionText', {
              onChange: () => {
                if (errors.questionText) form.clearErrors('questionText');
              },
            })}
          />
          {questionTextError ? (
            <p id="question-text-error" className="text-sm text-destructive" role="alert">
              {questionTextError}
            </p>
          ) : null}
        </div>

        {/* Image URL (optional) */}
        <div className="space-y-2">
          <Label htmlFor="question-image">Image URL (optional)</Label>
          <Input
            id="question-image"
            type="url"
            maxLength={IMAGE_MAX_LENGTH}
            disabled={isSubmitDisabled}
            placeholder="https://example.com/image.jpg"
            className={imageUrlError ? 'border-destructive' : ''}
            {...register('imageUrl')}
          />
          {imageUrlError ? (
            <p className="text-sm text-destructive" role="alert">
              {imageUrlError}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Optional image to display with the question.
          </p>
        </div>

        {/* Question type */}
        <div className="space-y-2">
          <Label>Question type</Label>
          <QuestionTypeSelect
            value={questionType}
            onChange={handleQuestionTypeChange}
            disabled={isSubmitDisabled}
          />
        </div>

        {/* Answer options */}
        <AnswerOptionsEditor
          options={options}
          questionType={questionType}
          onChange={handleOptionsChange}
          disabled={isSubmitDisabled}
          error={localOptionsError ?? undefined}
        />

        {/* Hook-level error (general) */}
        {hookError && !Object.keys(fieldErrors).length && (
          <p className="text-sm text-destructive" role="alert">
            {hookError.message}
          </p>
        )}

        {/* Submit button */}
        <div className="flex items-center justify-end gap-4 pt-4">
          {cooldownSeconds !== null && (
            <p className="text-sm text-muted-foreground">
              Rate limit: {cooldownSeconds}s remaining
            </p>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
});
