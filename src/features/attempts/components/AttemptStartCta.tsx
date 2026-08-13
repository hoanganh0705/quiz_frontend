'use client';

/**
 * `AttemptStartCta` — Start attempt CTA with concurrent-start reconciliation.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.22.
 *
 * ## Purpose
 *
 * Renders the canonical Start CTA on the quiz detail page. Drives:
 *
 *   - A single start attempt invocation per click.
 *   - Inline pending feedback (spinner + disabled).
 *   - Navigation to `/quizzes/[idOrSlug]/attempt` after a successful
 *     server-confirmed attempt start.
 *   - 409 `ATTEMPT_ALREADY_STARTED` reconciliation — the CTA swaps
 *     to Continue without a second start call.
 *   - `ATTEMPT_QUIZ_NOT_PUBLISHED` delegation to the public quiz
 *     route.
 *   - Unauthenticated activation handoff (no start request).
 *   - 429 / 5xx retryable state preserves the Start action.
 *
 * ## What this component does NOT own
 *
 *   - No service / SWR / store imports — the `useStartAttempt` hook
 *     encapsulates the cross-tab broadcast + Zustand update path.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { mutate as globalMutate } from 'swr';
import { Play, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { useToast } from '@/lib/forms/useToast';
import { getUserCopy } from '@/lib/api/error-codes';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
  useStartAttempt,
  type StartAttemptOutcome,
} from '@/features/attempts/hooks/useStartAttempt';

import { ApiError } from '@/lib/api';

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptStartCtaProps {
  /** Canonical quiz id (UUID). */
  quizId: string | null;
  /**
   * Canonical quiz-version id. Threaded through to `useStartAttempt`
   * so the runner-store reverse-index write uses the correct
   * identity and the runner page can resolve the just-started
   * attempt immediately on mount.
   */
  quizVersionId?: string | null;
  /** Route `idOrSlug` — required to build the runner URL on success. */
  idOrSlug: string | null;
  /**
   * `true` when the active lookup has resolved and no active attempt
   * exists. The CTA renders itself only when this is true.
   */
  isActiveResolvedEmpty: boolean;
  /**
   * Callback fired when the CTA swaps to Continue after a 409 race.
   * The CTA strip uses this to flip its visual branch.
   */
  onAlreadyStarted?: () => void;
  /**
   * Optional pre-built disabled tooltip copy (e.g. feature-flag
   * placeholder mode).
   */
  disabledTooltip?: string | null;
  /** Optional className for the button. */
  className?: string;
}

const DEFAULT_DISABLED_TOOLTIP = 'Starting attempts opens in a later release';
const BUTTON_CLASS = 'h-10 w-full min-w-40 sm:w-44';

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptStartCta(
  props: AttemptStartCtaProps,
): React.ReactElement | null {
  const {
    quizId,
    quizVersionId,
    idOrSlug,
    isActiveResolvedEmpty,
    onAlreadyStarted,
    disabledTooltip,
    className,
  } = props;

  const router = useRouter();
  const { push } = useToast();
  const { bootstrapState, currentUser } = useAuthSession();

  const isAuthenticated =
    bootstrapState === 'authenticated' && currentUser !== null;

  const startHook = useStartAttempt({
    quizId,
    quizVersionId,
  });

  // ─── Outcome side effects ───────────────────────────────────────────────
  const lastHandledRef = React.useRef<StartAttemptOutcome | null>(null);

  React.useEffect(() => {
    const outcome = startHook.outcome;
    if (!outcome) return;
    if (outcome === lastHandledRef.current) return;
    lastHandledRef.current = outcome;

    if (outcome.kind === 'success') {
      if (idOrSlug) {
        // Await the cache revalidation before navigating so the
        // /attempt page finds the active attempt immediately and
        // doesn't redirect back to the quiz page.
        const key = `/users/me/attempts?quizId=${encodeURIComponent(quizId ?? '')}&status=started&limit=1`;
        void globalMutate(key).then(() => {
          router.push(`/quizzes/${encodeURIComponent(idOrSlug)}/attempt`);
        });
      }
      startHook.reset();
      return;
    }
    if (outcome.kind === 'already_started') {
      const copy = getUserCopy('ATTEMPT_ALREADY_STARTED');
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      onAlreadyStarted?.();
      startHook.reset();
      return;
    }
    if (outcome.kind === 'quiz_unpublished') {
      const copy = getUserCopy('ATTEMPT_QUIZ_NOT_PUBLISHED');
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      if (idOrSlug) {
        router.replace(`/quizzes/${encodeURIComponent(idOrSlug)}`);
      }
      startHook.reset();
      return;
    }
    if (outcome.kind === 'retryable') {
      const apiError = outcome.error as ApiError;
      const copy = getUserCopy(apiError.code ?? 'GLOBAL_INTERNAL_ERROR');
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      return;
    }
  }, [
    startHook.outcome,
    startHook,
    router,
    push,
    idOrSlug,
    onAlreadyStarted,
  ]);

  // ─── Render guards ──────────────────────────────────────────────────────
  if (!isActiveResolvedEmpty) return null;
  if (!isAuthenticated) return null;

  const isPending = startHook.isPending;
  const error = startHook.error;
  const tooltip = error
    ? getUserCopy((error as ApiError).code ?? 'GLOBAL_INTERNAL_ERROR').body
    : (disabledTooltip ?? DEFAULT_DISABLED_TOOLTIP);

  const handleClick = () => {
    void startHook.start();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          tabIndex={0}
          data-testid="quiz-start-tooltip-trigger"
        >
          <Button
            type="button"
            className={className ?? BUTTON_CLASS}
            disabled={isPending || startHook.isCoolingDown}
            onClick={handleClick}
            aria-label={isPending ? 'Starting attempt…' : 'Start attempt'}
            data-testid="quiz-start-attempt-button"
          >
            {isPending ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play aria-hidden="true" />
                Start attempt
              </>
            )}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}