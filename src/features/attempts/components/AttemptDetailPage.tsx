"use client";

/**
 * `AttemptDetailPage` — read-only attempt detail page at
 * `/quiz-history/[attemptId]`.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.21.
 *
 * ## What this component owns
 *
 *   - Renders the score hero, breakdown, and per-question feedback in
 *     the same composition order as `AttemptResultPage` (T-4.15.12).
 *   - Shows the loading skeleton while the result query resolves.
 *   - Shows an empty fallback when the documented no-result projection
 *     resolves to `null`.
 *   - Renders `ATTEMPT_NOT_FOUND` / `ATTEMPT_FORBIDDEN` as a toast
 *     plus redirect to `/quiz-history`.
 *   - Does NOT render the "Write a review" CTA — that CTA is reserved
 *     for the result page surfaced after a fresh attempt completion.
 *   - Renders generic 5xx / 422 error banners with a refresh affordance.
 *
 * ## What this component does NOT own
 *
 *   - No service, store, or router code beyond the documented hook
 *     import (`useAttemptResult` from T-4.15.6).
 *   - No mutation.
 *   - No author question DTOs.
 *   - No review CTA.
 *
 * The page is mounted by the authenticated route at
 * `src/app/(protected)/quiz-history/[attemptId]/page.tsx` (T-4.15.22).
 */

import * as React from "react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
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

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptDetailPageProps {
  /**
   * Attempt identifier from the URL route. Pass `null` to render
   * the disabled / loading fallback.
   */
  attemptId: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptDetailPage(
  props: AttemptDetailPageProps,
): React.ReactElement {
  const { attemptId } = props;

  const { push } = useToast();

  const { result, isLoading, hasResolved, error, refresh } =
    useAttemptResult({ attemptId });

  // Side-effects: redirect on the documented error codes.
  React.useEffect(() => {
    if (error === null) return;
    if (error.code === "ATTEMPT_NOT_FOUND") {
      const copy = getUserCopy("ATTEMPT_NOT_FOUND");
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
    } else if (error.code === "ATTEMPT_FORBIDDEN") {
      const copy = getUserCopy("ATTEMPT_FORBIDDEN");
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
    }
  }, [error, push]);

  // ─── Loading skeleton ─────────────────────────────────────────────
  if (attemptId === null || isLoading || (!hasResolved && error === null)) {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
        data-testid="attempt-detail-page-skeleton"
      >
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // ─── Typed errors ────────────────────────────────────────────────
  if (error !== null) {
    // 404 / 403 — redirect handled by parent route; show back link.
    if (
      error.code === "ATTEMPT_NOT_FOUND" ||
      error.code === "ATTEMPT_FORBIDDEN"
    ) {
      return (
        <div
          className="mx-auto max-w-3xl space-y-3 p-4"
          data-testid="attempt-detail-page-redirecting"
        >
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </div>
      );
    }

    // 422 ATTEMPT_VALIDATION_FAILED — inline banner with back link.
    if (error.code === "ATTEMPT_VALIDATION_FAILED") {
      const copy = getUserCopy("ATTEMPT_VALIDATION_FAILED");
      return (
        <section
          className="mx-auto max-w-3xl space-y-3 p-4"
          aria-labelledby="attempt-detail-validation-heading"
          data-testid="attempt-detail-page-validation"
        >
          <h2
            id="attempt-detail-validation-heading"
            className="text-base font-semibold"
          >
            {copy.title}
          </h2>
          <p className="text-sm text-foreground" role="alert">
            {copy.body}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void refresh();
              }}
              data-testid="attempt-detail-page-retry"
            >
              Retry
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              asChild
            >
              <Link href="/quiz-history">Back to history</Link>
            </Button>
          </div>
        </section>
      );
    }

    // Generic 5xx / 429 / 401 — retry banner.
    const copy = getUserCopy(error.code);
    return (
      <section
        className="mx-auto max-w-3xl space-y-3 p-4"
        aria-labelledby="attempt-detail-error-heading"
        data-testid="attempt-detail-page-error"
      >
        <h2
          id="attempt-detail-error-heading"
          className="text-base font-semibold"
        >
          {copy.title}
        </h2>
        <p className="text-sm text-muted-foreground" role="alert">
          {copy.body}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh();
            }}
            data-testid="attempt-detail-page-error-retry"
          >
            Retry
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
          >
            <Link href="/quiz-history">Back to history</Link>
          </Button>
        </div>
      </section>
    );
  }

  // ─── Empty result (no completed review yet) ───────────────────────
  if (result === null) {
    return (
      <section
        className="mx-auto max-w-3xl space-y-3 p-4"
        aria-labelledby="attempt-detail-empty-heading"
        data-testid="attempt-detail-page-empty"
      >
        <h2
          id="attempt-detail-empty-heading"
          className="text-base font-semibold"
        >
          No result yet
        </h2>
        <p className="text-sm text-muted-foreground">
          The review for this attempt is not available yet.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href="/quiz-history">Back to history</Link>
        </Button>
      </section>
    );
  }

  // ─── Success: compose the detail page ─────────────────────────────
  const summary: AttemptScoreSummaryDto = scoreSummaryFromResult(result);
  const total = result.questions.length;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
      data-testid="attempt-detail-page"
    >
      <AttemptScoreHero summary={summary} />
      <AttemptBreakdown questions={result.questions} total={total} />
      {result.questions.map((q) => (
        <AttemptQuestionFeedback
          key={q.questionId}
          feedback={q.explanation ?? null}
        />
      ))}
    </div>
  );
}
