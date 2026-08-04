"use client";

/**
 * `AttemptResultPage` — result-page composition for a completed attempt.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.12.
 *
 * ## What this component owns
 *
 * - Renders the score hero, breakdown, feedback, and "Write a review"
 *   CTA in the approved order from the verified `AttemptResultDto`.
 * - Shows the loading skeleton while the result query resolves.
 * - Shows the empty-result fallback when the documented
 *   "no result yet" projection resolves to `null`.
 * - Renders `ATTEMPT_NOT_ACTIVE` swap-on errors as a result page
 *   (without toast spam).
 * - Renders `ATTEMPT_NOT_FOUND` / `ATTEMPT_FORBIDDEN` as a toast
 *   plus redirect to `/quizzes`.
 * - Renders `ATTEMPT_VALIDATION_FAILED` as an inline banner
 *   "Submit at least one answer" and keeps the runner mounted (the
 *   runner page mounts the result view conditionally; this page
 *   emits the signal).
 *
 * ## What this component does NOT own
 *
 * - No service, store, or router code beyond the documented hook
 *   imports.
 * - No author question DTOs.
 * - No pre-completion review DTOs.
 * - No completion polling — the result page is read-only.
 *
 * The page composes the score hero (T-4.15.8), the breakdown
 * (T-4.15.9), the feedback blocks (T-4.15.10), and the review CTA
 * (T-4.15.11). It is mounted by the runner page once the
 * `useCompleteAttempt` outcome resolves to `success` / `not_active`.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/lib/forms/useToast";
import { getUserCopy } from "@/lib/api/error-codes";

import { useAttemptResult } from "@/features/attempts/hooks/useAttemptResult";
import {
  scoreSummaryFromResult,
  type AttemptScoreSummaryDto,
} from "@/features/attempts/types/attempt-result.types";
import { AttemptScoreHero } from "./AttemptScoreHero";
import { AttemptBreakdown } from "./AttemptBreakdown";
import { AttemptQuestionFeedback } from "./AttemptQuestionFeedback";
import { AttemptWriteReviewCta } from "./AttemptWriteReviewCta";

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptResultPageProps {
  /**
   * Attempt identifier to fetch the result for. Pass `null` to
   * render the disabled / loading fallback.
   */
  attemptId: string | null;
  /**
   * Optional callback invoked when the result view mounts with a
   * `null` result (no completed review yet). The runner page uses
   * this signal to keep the in-progress runner surface mounted so
   * the user can finish the attempt.
   */
  onNoResult?: (() => void) | undefined;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptResultPage(
  props: AttemptResultPageProps,
): React.ReactElement {
  const { attemptId, onNoResult } = props;

  const router = useRouter();
  const { push } = useToast();

  const { result, isLoading, hasResolved, error, refresh } =
    useAttemptResult({ attemptId });

  // Side-effects: redirect + toast on the documented error codes.
  // These run once when the result resolves to a typed error.
  React.useEffect(() => {
    if (error === null) return;
    if (error.code === "ATTEMPT_NOT_FOUND") {
      const copy = getUserCopy("ATTEMPT_NOT_FOUND");
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      router.replace("/quizzes");
    } else if (error.code === "ATTEMPT_FORBIDDEN") {
      const copy = getUserCopy("ATTEMPT_FORBIDDEN");
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      router.replace("/quizzes");
    }
  }, [error, push, router]);

  // No-result signal: parent can use this to keep the runner mounted.
  React.useEffect(() => {
    if (
      hasResolved &&
      error === null &&
      result === null &&
      typeof onNoResult === "function"
    ) {
      onNoResult();
    }
  }, [hasResolved, error, result, onNoResult]);

  // ─── Loading skeleton ─────────────────────────────────────────────
  if (attemptId === null || isLoading || (!hasResolved && error === null)) {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
        data-testid="attempt-result-page-skeleton"
      >
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // ─── Typed errors: 401/403/404/429/5xx ────────────────────────────
  if (error !== null) {
    // 403 ATTEMPT_NOT_ACTIVE — render the swap-on view without toast.
    if (error.code === "ATTEMPT_NOT_ACTIVE") {
      return (
        <section
          className="mx-auto max-w-3xl space-y-3 p-4"
          aria-labelledby="attempt-result-not-active-heading"
          data-testid="attempt-result-page-not-active"
        >
          <h2
            id="attempt-result-not-active-heading"
            className="text-base font-semibold"
          >
            Result ready
          </h2>
          <p className="text-sm text-muted-foreground">
            This attempt is no longer active. We are loading the result.
          </p>
        </section>
      );
    }

    // 422 ATTEMPT_VALIDATION_FAILED — inline banner keeps runner mounted.
    if (error.code === "ATTEMPT_VALIDATION_FAILED") {
      const copy = getUserCopy("ATTEMPT_VALIDATION_FAILED");
      return (
        <section
          className="mx-auto max-w-3xl space-y-3 p-4"
          aria-labelledby="attempt-result-validation-heading"
          data-testid="attempt-result-page-validation"
        >
          <h2
            id="attempt-result-validation-heading"
            className="text-base font-semibold"
          >
            {copy.title}
          </h2>
          <p
            className="text-sm text-foreground"
            role="alert"
            data-testid="attempt-result-page-validation-body"
          >
            {copy.body}
          </p>
          <button
            type="button"
            className="text-sm font-medium underline"
            onClick={() => {
              void refresh();
            }}
            data-testid="attempt-result-page-retry"
          >
            Retry
          </button>
        </section>
      );
    }

    // 404 / 403 ATTEMPT_FORBIDDEN — toast + redirect handled in effect.
    if (
      error.code === "ATTEMPT_NOT_FOUND" ||
      error.code === "ATTEMPT_FORBIDDEN"
    ) {
      return (
        <div
          className="mx-auto max-w-3xl space-y-3 p-4"
          data-testid="attempt-result-page-redirecting"
        >
          <p className="text-sm text-muted-foreground">
            Redirecting…
          </p>
        </div>
      );
    }

    // 401 / 429 / 5xx — generic retry banner.
    const copy = getUserCopy(error.code);
    return (
      <section
        className="mx-auto max-w-3xl space-y-3 p-4"
        aria-labelledby="attempt-result-error-heading"
        data-testid="attempt-result-page-error"
      >
        <h2
          id="attempt-result-error-heading"
          className="text-base font-semibold"
        >
          {copy.title}
        </h2>
        <p className="text-sm text-muted-foreground" role="alert">
          {copy.body}
        </p>
        <button
          type="button"
          className="text-sm font-medium underline"
          onClick={() => {
            void refresh();
          }}
          data-testid="attempt-result-page-error-retry"
        >
          Retry
        </button>
      </section>
    );
  }

  // ─── Empty result (no completed review yet) ───────────────────────
  if (result === null) {
    return (
      <section
        className="mx-auto max-w-3xl space-y-3 p-4"
        aria-labelledby="attempt-result-empty-heading"
        data-testid="attempt-result-page-empty"
      >
        <h2
          id="attempt-result-empty-heading"
          className="text-base font-semibold"
        >
          No result yet
        </h2>
        <p className="text-sm text-muted-foreground">
          The review for this attempt is not ready. Keep the runner mounted
          and we&apos;ll surface the result as soon as it&apos;s available.
        </p>
      </section>
    );
  }

  // ─── Success: compose the result page ─────────────────────────────
  const summary: AttemptScoreSummaryDto = scoreSummaryFromResult(result);
  const total = result.questions.length;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
      data-testid="attempt-result-page"
    >
      <AttemptScoreHero summary={summary} />
      <AttemptBreakdown questions={result.questions} total={total} />
      {result.questions.map((q) => (
        <AttemptQuestionFeedback
          key={q.questionId}
          feedback={q.explanation ?? null}
        />
      ))}
      <AttemptWriteReviewCta
        quizId={result.quizId}
        quizSlug={result.quizSlug}
      />
    </div>
  );
}