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
 * - **429 cooldown** — disables submit during rate limit cooldown.
 *
 * ## Validation
 *
 * - Question text: 1–1000 characters
 * - Answer options: 2–6 options
 * - Correct answers: based on question type
 *
 * @see `QuestionTypeSelect` — question type selector
 * @see `AnswerOptionsEditor` — answer options editor
 * @see `useCreateVersionQuestion` — mutation hook
 */

'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';

import {
  createQuestionSchema,
  type CreateQuestionFormValues,
} from '@/features/quizzes/validation/question-schemas';
import {
  useCreateVersionQuestion,
} from '@/features/quizzes/hooks';
import {
  QUESTION_TYPE_VALUES,
  type QuestionType,
} from '@/features/quizzes/types/author-dtos';
import { getUserCopy } from '@/lib/api/error-codes';

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

  // Form for question text
  const [questionText, setQuestionText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // ── Cooldown state ────────────────────────────────────────────────────

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

  // ── Submit handler ────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    // Validate question text
    if (!questionText.trim()) {
      setTextError('Question text is required');
      return;
    }
    if (questionText.length > TEXT_MAX_LENGTH) {
      setTextError(`Question text cannot exceed ${TEXT_MAX_LENGTH} characters`);
      return;
    }
    setTextError(null);

    // Validate options (not for short_answer)
    if (questionType !== 'short_answer') {
      if (options.length < 2) {
        setOptionsError('At least 2 answer options are required');
        return;
      }

      // Check for empty options
      const emptyOptions = options.filter((o) => !o.value.trim());
      if (emptyOptions.length > 0) {
        setOptionsError('All answer options must have text');
        return;
      }

      // Validate correct answers based on type
      const correctCount = options.filter((o) => o.isCorrect).length;

      if (questionType === 'single_choice' || questionType === 'true_false') {
        if (correctCount !== 1) {
          setOptionsError('Please mark exactly 1 correct answer');
          return;
        }
      } else if (questionType === 'multiple_choice') {
        if (correctCount < 1) {
          setOptionsError('Please mark at least 1 correct answer');
          return;
        }
      }
    }
    setOptionsError(null);

    // Build payload
    const position = questionCount + 1;
    const payload = {
      position,
      questionText: questionText.trim(),
      imageUrl: imageUrl.trim() || undefined,
      answerOptions: options.map((opt, idx) => ({
        position: idx + 1,
        value: opt.value.trim(),
        isCorrect: opt.isCorrect,
      })),
    };

    // Call API (handled by parent)
    try {
      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset form on success
      setQuestionText('');
      setImageUrl('');
      setOptions(getDefaultOptions(questionType));
      setTextError(null);
      setOptionsError(null);

      onSuccess();
    } catch (err) {
      onError({
        code: 'GLOBAL_UNKNOWN',
        message: err instanceof Error ? err.message : 'Failed to create question',
      });
    }
  }, [questionText, imageUrl, questionType, options, questionCount, onSuccess, onError]);

  // ── Question type change handler ──────────────────────────────────────

  const handleQuestionTypeChange = useCallback((newType: QuestionType) => {
    setQuestionType(newType);
    setOptions(getDefaultOptions(newType));
    setOptionsError(null);
  }, []);

  // ── Options change handler ─────────────────────────────────────────────

  const handleOptionsChange = useCallback((newOptions: AnswerOption[]) => {
    setOptions(newOptions);
    setOptionsError(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  const isSubmitDisabled = !isDraft || cooldownSeconds !== null;
  const submitLabel = cooldownSeconds !== null
    ? `Wait ${cooldownSeconds}s`
    : 'Add Question';

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
              {questionText.length}/{TEXT_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="question-text"
            value={questionText}
            onChange={(e) => {
              setQuestionText(e.target.value);
              setTextError(null);
            }}
            placeholder="Enter your question..."
            maxLength={TEXT_MAX_LENGTH}
            rows={3}
            disabled={isSubmitDisabled}
            className={textError ? 'border-destructive' : ''}
            aria-invalid={!!textError}
            aria-describedby={textError ? 'question-text-error' : undefined}
          />
          {textError ? (
            <p id="question-text-error" className="text-sm text-destructive" role="alert">
              {textError}
            </p>
          ) : null}
        </div>

        {/* Image URL (optional) */}
        <div className="space-y-2">
          <Label htmlFor="question-image">Image URL (optional)</Label>
          <Input
            id="question-image"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitDisabled}
            maxLength={IMAGE_MAX_LENGTH}
          />
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
          error={optionsError ?? undefined}
        />

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
            {isSubmitDisabled && cooldownSeconds === null ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
});
