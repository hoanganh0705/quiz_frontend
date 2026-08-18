"use client";

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

export interface AttemptDetailPageProps {

attemptId: string | null;
}

export function AttemptDetailPage(
props: AttemptDetailPageProps,
): React.ReactElement {
const { attemptId } = props;

const { push } = useToast();

const { result, isLoading, hasResolved, error, refresh } =
useAttemptResult({ attemptId });

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

if (error !== null) {

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
