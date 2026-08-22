"use client";

import { CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";

import { getUserCopy } from "@/lib/api/error-codes";
import { cn } from "@/shared/utils/merge-class-names";

import {
useSubmitInstanceAnswer,
useInstanceLifecycle,
type UseSubmitInstanceAnswerResult,
} from "@/features/instances/play/hooks";

interface GameAnswerSubmissionStateProps {
instanceId: string;
className?: string;
}

type StateIcon = {
idle: null;
pending: typeof Loader2;
accepted: typeof CheckCircle2;
rejected: typeof XCircle;
};

const STATE_ICONS: StateIcon = {
idle: null,
pending: Loader2,
accepted: CheckCircle2,
rejected: XCircle,
};

const STATE_CLASSES: Record<
"idle" | "pending" | "accepted" | "rejected",
{ container: string; text: string; label: string }
> = {
idle: {
container: "bg-muted/30 border-border",
text: "text-muted-foreground",
label: "Awaiting your answer",
  },
pending: {
container: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
text: "text-blue-700 dark:text-blue-300",
label: "Submitting your answer…",
  },
accepted: {
container: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
text: "text-green-700 dark:text-green-300",
label: "Answer submitted",
  },
rejected: {
container: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
text: "text-red-700 dark:text-red-300",
label: "Submission failed",
  },
};

function getSubmissionErrorCopy(code: string): { title: string; body: string } {
const copy = getUserCopy(code);
return { title: copy.title ?? "Submission failed", body: copy.body ?? "An error occurred." };
}

export function GameAnswerSubmissionState({
instanceId,
className,
}: GameAnswerSubmissionStateProps) {
const { state, lastError }: UseSubmitInstanceAnswerResult =
useSubmitInstanceAnswer(instanceId, null);
const { lastResult } = useInstanceLifecycle(instanceId);

const config = STATE_CLASSES[state];
const Icon = STATE_ICONS[state];

return (
<div
className={cn("space-y-2", className)}
data-testid="answer-submission-state"
role="status"
aria-live="polite"
    >
{/* State banner */}
<div
className={cn(
"flex items-center gap-3 px-4 py-3 rounded-lg border",
config.container,
        )}
data-testid="submission-banner"
data-state={state}
      >
{Icon && (
<Icon
className={cn(
"h-4 w-4 shrink-0",
config.text,
state === "pending" && "animate-spin",
            )}
aria-hidden="true"
          />
        )}
<p className={cn("text-sm font-medium", config.text)}>
{config.label}
</p>
</div>

{/* Error copy — shown for rejected state */}
{state === "rejected" && lastError && (
<div
className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
data-testid="submission-error"
role="alert"
        >
<AlertCircle
className="h-4 w-4 shrink-0 mt-0.5 text-destructive"
aria-hidden="true"
          />
<div className="flex-1 min-w-0">
<p className="text-sm font-medium text-red-700 dark:text-red-300">
{getSubmissionErrorCopy(lastError.code).title}
</p>
<p className="text-xs text-destructive dark:text-red-400 mt-0.5">
{getSubmissionErrorCopy(lastError.code).body}
</p>
</div>
</div>
      )}

{/* Result display — shown only after server-approved reveal */}
{state === "accepted" && lastResult && lastResult.revealed && (
<div
className="flex items-center gap-2 px-3 py-2 rounded-lg border"
data-testid="submission-result"
        >
{lastResult.isCorrect ? (
<CheckCircle2
className="h-4 w-4 shrink-0 text-success"
aria-hidden="true"
            />
          ) : (
<XCircle
className="h-4 w-4 shrink-0 text-destructive"
aria-hidden="true"
            />
          )}
<div>
<p
className={cn(
"text-sm font-medium",
lastResult.isCorrect
? "text-green-700 dark:text-green-300"
: "text-red-700 dark:text-red-300",
              )}
            >
{lastResult.isCorrect ? "Correct!" : "Incorrect"}
</p>
<p className="text-xs text-muted-foreground">
{lastResult.awardedPoints > 0
? `+${lastResult.awardedPoints} points`
: "0 points"}
</p>
</div>
</div>
      )}

{/* Accepted state — just acknowledged, no result yet */}
{state === "accepted" && (!lastResult || !lastResult.revealed) && (
<p className="text-xs text-muted-foreground">
Your answer has been recorded. The result will appear after the timer ends.
        </p>
      )}
</div>
  );
}
