'use client';

/**
 * `AttemptContinueCta` — Continue active attempt CTA.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.23.
 *
 * ## Purpose
 *
 * Renders the "Continue attempt" CTA on the quiz detail page when the
 * authenticated user has a verified in-progress attempt. Routes to
 * `/quizzes/[idOrSlug]/attempt` without issuing a start request.
 *
 * ## What this component does NOT own
 *
 *   - No service / SWR / mutation hooks. The active summary is
 *     passed in by the parent (the `QuizCtaStrip` after Batch 5
 *     integration) so the same SWR key serves Continue across the
 *     page.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptContinueCtaProps {
  /** Active attempt summary from `useActiveAttempt`. */
  activeAttempt: AttemptSummaryResponseDto | null;
  /** Route `idOrSlug`. */
  idOrSlug: string | null;
  /** True while the active lookup is in flight. */
  isPending?: boolean;
  /** Optional className for the button. */
  className?: string;
}

const BUTTON_CLASS = 'h-10 w-full min-w-40 sm:w-44';

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptContinueCta(
  props: AttemptContinueCtaProps,
): React.ReactElement | null {
  const { activeAttempt, idOrSlug, isPending = false, className } = props;

  const router = useRouter();
  const navigatingRef = React.useRef(false);

  const attemptId = activeAttempt?.attemptId ?? null;
  const status = activeAttempt?.status ?? null;
  const isStarted = status === 'started';

  // CTA renders only with a verified active attempt.
  if (attemptId === null || !isStarted) return null;

  const handleClick = () => {
    if (navigatingRef.current) return;
    if (!idOrSlug) return;
    navigatingRef.current = true;
    router.push(`/quizzes/${encodeURIComponent(idOrSlug)}/attempt`);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          tabIndex={0}
          data-testid="quiz-continue-tooltip-trigger"
        >
          <Button
            type="button"
            className={className ?? BUTTON_CLASS}
            disabled={isPending}
            onClick={handleClick}
            aria-label="Continue attempt"
            data-testid="quiz-continue-attempt-button"
          >
            <Play aria-hidden="true" />
            Continue attempt
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>
        You have an in-progress attempt for this quiz.
      </TooltipContent>
    </Tooltip>
  );
}