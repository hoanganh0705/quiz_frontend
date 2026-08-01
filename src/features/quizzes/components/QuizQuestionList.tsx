/**
 * `QuizQuestionList` — ordered player-view question list with
 * documented empty-state copy.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.D2.
 *
 * Composes `<QuizQuestionCard>` per question in normalized order
 * (by `position`). When the input is empty (e.g. the published
 * version has no questions yet), the list renders the documented
 * "Quiz is being prepared" copy and a `mailto:support@quizhub.com`
 * support link — never a start-attempt affordance.
 *
 * ## Visual numbering
 *
 * Numbering follows the A3-normalized `position`, not the array
 * index. The list passes the visual position to each card so the
 * card's badge displays the canonical ordering regardless of any
 * defensive re-sort performed by D1.
 *
 * ## Accessibility
 *
 * The list uses `<section>` + `<ol>` semantics with an accessible
 * heading. The empty state uses the same heading level so a
 * screen reader navigating the page does not skip the section.
 */

'use client';

import { MailQuestion } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

import { QuizQuestionCard } from './QuizQuestionCard';
import type { PlayerQuestion } from '../lib/quiz-player-view';

const SECTION = 'flex flex-col gap-4';
const SECTION_TITLE =
  'text-xl font-semibold text-foreground sm:text-2xl';
const LIST = 'flex flex-col gap-4';
const EMPTY_OUTER =
  'flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-8';
const EMPTY_TITLE = 'text-base font-medium text-foreground';
const SUPPORT_LINK =
  'inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline';

const SUPPORT_EMAIL = 'support@quizhub.com';
const EMPTY_TITLE_TEXT = 'Quiz is being prepared';
const SECTION_HEADING_TEXT = 'Questions';

export interface QuizQuestionListProps {
  questions: PlayerQuestion[];
  className?: string;
}

export function QuizQuestionList({
  questions,
  className,
}: QuizQuestionListProps) {
  const isEmpty = questions.length === 0;

  return (
    <section
      className={cn(SECTION, className)}
      data-testid='quiz-question-list'
      data-empty={isEmpty ? 'true' : 'false'}
      aria-labelledby='quiz-question-list-heading'
    >
      <h2
        id='quiz-question-list-heading'
        className={SECTION_TITLE}
        data-testid='quiz-question-list-heading'
      >
        {SECTION_HEADING_TEXT}
      </h2>

      {isEmpty ? (
        <div
          className={EMPTY_OUTER}
          data-testid='quiz-question-list-empty'
          role='status'
        >
          <MailQuestion
            className='h-6 w-6 text-muted-foreground'
            aria-hidden='true'
          />
          <p className={EMPTY_TITLE}>{EMPTY_TITLE_TEXT}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={SUPPORT_LINK}
            data-testid='quiz-question-list-support-link'
          >
            Contact support: {SUPPORT_EMAIL}
          </a>
        </div>
      ) : (
        <ol
          className={LIST}
          data-testid='quiz-question-list-items'
          aria-label={`Quiz questions, ${questions.length} total`}
        >
          {questions
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((question, index) => (
              <li
                key={question.questionId}
                data-testid='quiz-question-list-item'
              >
                <QuizQuestionCard
                  question={question}
                  displayPosition={index + 1}
                />
              </li>
            ))}
        </ol>
      )}
    </section>
  );
}
