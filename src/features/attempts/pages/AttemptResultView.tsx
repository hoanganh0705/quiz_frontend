"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getUserCopy } from "@/lib/api/error-codes";
import { useToast } from "@/lib/forms/useToast";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { AttemptBreakdown } from "@/features/attempts/components/AttemptBreakdown";
import { AttemptScoreHero } from "@/features/attempts/components/AttemptScoreHero";
import { AttemptWriteReviewCta } from "@/features/attempts/components/AttemptWriteReviewCta";
import { useAttemptResult } from "@/features/attempts/hooks/useAttemptResult";
import { scoreSummaryFromResult } from "@/features/attempts/types/attempt-result.types";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

import type { AttemptScoreSummaryDto } from "@/features/attempts/types/attempt-result.types";

export type AttemptResultViewMode = "detail" | "result";

export interface AttemptResultViewProps {
  attemptId: string | null;
  mode?: AttemptResultViewMode;
  onNoResult?: (() => void) | undefined;
}

export function AttemptResultView({
  attemptId,
  mode = "result",
  onNoResult,
}: AttemptResultViewProps): React.ReactElement {
  const isDetail = mode === "detail";
  const testIdPrefix = isDetail ? "attempt-detail-page" : "attempt-result-page";
  const redirectRoute = isDetail ? "/quiz-history" : "/quizzes";

  const router = useRouter();
  const { push } = useToast();

  const { result, isLoading, hasResolved, error, refresh } = useAttemptResult({
    attemptId,
  });

  React.useEffect(() => {
    if (error === null) return;
    if (
      error.code === "ATTEMPT_NOT_FOUND" ||
      error.code === "ATTEMPT_FORBIDDEN"
    ) {
      const copy = getUserCopy(error.code);
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      router.replace(redirectRoute);
    }
  }, [error, push, router, redirectRoute]);

  React.useEffect(() => {
    if (
      !isDetail &&
      hasResolved &&
      error === null &&
      result === null &&
      typeof onNoResult === "function"
    ) {
      onNoResult();
    }
  }, [isDetail, hasResolved, error, result, onNoResult]);

  if (attemptId === null || isLoading || (!hasResolved && error === null)) {
    return (
      <div
        className={`${PAGE_CONTAINER_CLASS} flex flex-col gap-4`}
        data-testid={`${testIdPrefix}-skeleton`}
      >
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error !== null) {
    if (!isDetail && error.code === "ATTEMPT_NOT_ACTIVE") {
      return (
        <section
          className={`${PAGE_CONTAINER_CLASS} space-y-3`}
          aria-labelledby="attempt-result-not-active-heading"
          data-testid={`${testIdPrefix}-not-active`}
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

    if (
      error.code === "ATTEMPT_NOT_FOUND" ||
      error.code === "ATTEMPT_FORBIDDEN"
    ) {
      return (
        <div
          className={`${PAGE_CONTAINER_CLASS} space-y-3`}
          data-testid={`${testIdPrefix}-redirecting`}
        >
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </div>
      );
    }

    if (error.code === "ATTEMPT_VALIDATION_FAILED") {
      const copy = getUserCopy("ATTEMPT_VALIDATION_FAILED");
      return (
        <section
          className={`${PAGE_CONTAINER_CLASS} space-y-3`}
          aria-labelledby={`${testIdPrefix}-validation-heading`}
          data-testid={`${testIdPrefix}-validation`}
        >
          <h2
            id={`${testIdPrefix}-validation-heading`}
            className="text-base font-semibold"
          >
            {copy.title}
          </h2>
          <p
            className="text-sm text-foreground"
            role="alert"
            data-testid={`${testIdPrefix}-validation-body`}
          >
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
              data-testid={`${testIdPrefix}-retry`}
            >
              Retry
            </Button>
            {isDetail ? (
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href="/quiz-history">Back to history</Link>
              </Button>
            ) : null}
          </div>
        </section>
      );
    }

    const copy = getUserCopy(error.code);
    return (
      <section
        className={`${PAGE_CONTAINER_CLASS} space-y-3`}
        aria-labelledby={`${testIdPrefix}-error-heading`}
        data-testid={`${testIdPrefix}-error`}
      >
        <h2
          id={`${testIdPrefix}-error-heading`}
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
            data-testid={`${testIdPrefix}-error-retry`}
          >
            Retry
          </Button>
          {isDetail ? (
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/quiz-history">Back to history</Link>
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  if (result === null) {
    return (
      <section
        className={`${PAGE_CONTAINER_CLASS} space-y-3`}
        aria-labelledby={`${testIdPrefix}-empty-heading`}
        data-testid={`${testIdPrefix}-empty`}
      >
        <h2
          id={`${testIdPrefix}-empty-heading`}
          className="text-base font-semibold"
        >
          No result yet
        </h2>
        <p className="text-sm text-muted-foreground">
          {isDetail
            ? "The review for this attempt is not available yet."
            : "The review for this attempt is not ready. Keep the runner mounted and we'll surface the result as soon as it's available."}
        </p>
        {isDetail ? (
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/quiz-history">Back to history</Link>
          </Button>
        ) : null}
      </section>
    );
  }

  const summary: AttemptScoreSummaryDto = scoreSummaryFromResult(result);
  const total = result.questions.length;

  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} flex flex-col gap-4`}
      data-testid={testIdPrefix}
    >
      <AttemptScoreHero summary={summary} />
      <AttemptBreakdown questions={result.questions} total={total} />
      {!isDetail ? (
        <AttemptWriteReviewCta
          quizId={result.quizId}
          quizSlug={result.quizSlug}
        />
      ) : null}
    </div>
  );
}
