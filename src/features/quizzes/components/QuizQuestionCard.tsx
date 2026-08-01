/**
 * `QuizQuestionCard` — non-interactive preview card for a single
 * player-view question.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.D1.
 *
 * Renders one player-safe question and its ordered options.
 *
 * ## Player-safe by construction
 *
 * The component accepts only the A3 `PlayerQuestion` type. That
 * type carries no `isCorrect` member. The component therefore
 * has no way to render, serialize, or class-name correctness
 * data — the type system enforces the no-spoiler invariant at the
 * boundary. The D3 regression suite additionally asserts no
 * forbidden key appears anywhere in the rendered subtree.
 *
 * ## Read-only
 *
 * Options render as plain read-only rows. They are not radio
 * buttons, checkboxes, or any form control — the player view is
 * for previewing the quiz, not attempting it.
 *
 * ## Image handling
 *
 * Optional `imageUrl` is rendered with explicit responsive
 * dimensions and lazy loading. Missing images leave no empty
 * frame — the wrapper reserves the same aspect ratio so the
 * card's height does not shift.
 */

'use client';

import { cn } from '@/shared/utils/merge-class-names';

import type { PlayerQuestion } from '../lib/quiz-player-view';

const CARD_OUTER =
  'flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6';
const HEADER_ROW = 'flex items-baseline justify-between gap-3';
const POSITION_BADGE =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground';
const QUESTION_TEXT = 'text-base font-medium text-foreground sm:text-lg';
const IMAGE_WRAPPER =
  'relative w-full overflow-hidden rounded-lg bg-muted';
const IMAGE_ASPECT = 'aspect-[16/9]';
const IMAGE_IMG = 'object-cover';
const OPTIONS_LIST = 'flex flex-col gap-2';
const OPTION_ROW =
  'flex items-start gap-3 rounded-md border bg-background p-3 text-sm';
const OPTION_LETTER =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground';
const OPTION_TEXT = 'text-foreground';

export interface QuizQuestionCardProps {
  question: PlayerQuestion;
  /** Visual position number (1-based) — owned by the list, not the question. */
  displayPosition: number;
  className?: string;
}

function optionLetter(position: number): string {
  // Letters cap at Z; the player view never sees more than
  // a handful of options per question, but we guard against
  // the edge case for safety.
  if (position <= 0) return '?';
  if (position <= 26) {
    return String.fromCharCode('A'.charCodeAt(0) + position - 1);
  }
  return '?';
}

export function QuizQuestionCard({
  question,
  displayPosition,
  className,
}: QuizQuestionCardProps) {
  return (
    <article
      className={cn(CARD_OUTER, className)}
      data-testid='quiz-question-card'
      data-question-id={question.questionId}
      data-position={displayPosition}
    >
      <header className={HEADER_ROW}>
        <span
          className={POSITION_BADGE}
          aria-label={`Question ${displayPosition}`}
        >
          {displayPosition}
        </span>
      </header>

      <p className={QUESTION_TEXT}>{question.questionText}</p>

      {question.imageUrl ? (
        <div className={cn(IMAGE_WRAPPER, IMAGE_ASPECT)}>
          {/* Plain <img> (not next/image) so the primitive works
              inside unit tests without remote-pattern config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt={`Image for question ${displayPosition}`}
            loading='lazy'
            className={IMAGE_IMG}
          />
        </div>
      ) : null}

      <ol
        className={OPTIONS_LIST}
        data-testid='quiz-question-options'
        aria-label={`Answer options for question ${displayPosition}`}
      >
        {[...question.answerOptions]
          .sort((a, b) => a.position - b.position)
          .map((option) => (
            <li
              key={option.optionId}
              className={OPTION_ROW}
              data-testid='quiz-question-option'
              data-option-id={option.optionId}
              data-option-position={option.position}
            >
              <span className={OPTION_LETTER} aria-hidden='true'>
                {optionLetter(option.position)}
              </span>
              <span className={OPTION_TEXT}>{option.value}</span>
            </li>
          ))}
      </ol>
    </article>
  );
}
