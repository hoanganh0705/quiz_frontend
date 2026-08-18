"use client";

import { type ReactElement } from "react";

import type { ApiError } from "@/lib/api";

interface AnalyticsErrorStateProps {

error: ApiError;

isStale: boolean;

onRetry: () => void;
}

const STATUS_COPY: Record<number, string> = {
404: "We couldn't find this user",
403: "This isn't available to you",
429: "Slow down a moment",
500: "Something went wrong on our end",
502: "Something went wrong on our end",
503: "Something went wrong on our end",
504: "Something went wrong on our end",
};

const CODE_COPY: Record<string, string> = {
SOCIAL_USER_NOT_FOUND: "We couldn't find this user",
SOCIAL_FRIEND_LIST_FORBIDDEN:
"Only the user and their friends can see this",
SOCIAL_USER_BLOCKED: "This user isn't available right now",
SOCIAL_BLOCKED_USER: "This user isn't available right now",
GLOBAL_RATE_LIMITED: "Slow down a moment",
GLOBAL_INTERNAL_ERROR: "Something went wrong on our end",
GLOBAL_UNAUTHENTICATED: "Sign in to view this",
GLOBAL_FORBIDDEN: "This isn't available to you",
};

const DEFAULT_COPY = "We couldn't load this right now";

export function resolveAnalyticsErrorCopy(error: ApiError): string {
const code = error.code;
if (typeof code === "string" && code in CODE_COPY) {
return CODE_COPY[code]!;
  }
const status = error.status;
if (typeof status === "number" && status in STATUS_COPY) {
return STATUS_COPY[status]!;
  }
return DEFAULT_COPY;
}

export function AnalyticsErrorState({
error,
isStale,
onRetry,
}: AnalyticsErrorStateProps): ReactElement {
const copy = resolveAnalyticsErrorCopy(error);
const status = error.status;
return (
<section
role="alert"
data-testid="analytics-error"
data-stale={isStale ? "true" : "false"}
aria-live="assertive"
className="flex flex-col gap-2 p-6 rounded-md border border-destructive text-center"
    >
{isStale ? (
<p
data-testid="analytics-error-stale-marker"
className="text-xs uppercase tracking-wide text-muted-foreground"
        >
This update failed in the background
        </p>
      ) : null}
<h3 className="text-base font-semibold">{copy}</h3>
{typeof status === "number" ? (
<p className="text-xs text-muted-foreground">Error {status}</p>
      ) : null}
<button
type="button"
onClick={onRetry}
data-testid="analytics-error-retry"
className="self-center mt-2 px-3 py-1 text-sm rounded-md border border-border"
      >
Try again
      </button>
</section>
  );
}

export const __testing = {
STATUS_COPY,
CODE_COPY,
DEFAULT_COPY,
resolveAnalyticsErrorCopy,
};