"use client";

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

export interface AttemptResultPageProps {

attemptId: string | null;

onNoResult?: (() => void) | undefined;
}

export function AttemptResultPage(
props: AttemptResultPageProps,
): React.ReactElement {
const { attemptId, onNoResult } = props;

const router = useRouter();
const { push } = useToast();

const { result, isLoading, hasResolved, error, refresh } =
useAttemptResult({ attemptId });

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

if (error !== null) {

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