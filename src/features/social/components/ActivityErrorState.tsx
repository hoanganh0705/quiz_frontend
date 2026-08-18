"use client";

import { type ReactElement } from "react";

import { isActivityRateLimitCode } from "@/features/social/activity-discriminator";

import type { ApiError } from "@/lib/api";

interface ActivityErrorStateProps {

error: ApiError | null;

onRetry: () => void;

copyOverride?: { title: string; body: string };
}

interface ResolvedCopy {
readonly title: string;
readonly body: string;
}

const COPY: Record<string, ResolvedCopy> = {
SOCIAL_USER_NOT_FOUND: {
title: "This account is no longer available",
body: "We couldn't find this user. They may have been removed.",
  },
SOCIAL_USER_BLOCKED: {
title: "This user isn't available",
body: "This user's activity isn't available to you.",
  },
SOCIAL_BLOCKED_USER: {
title: "This user isn't available",
body: "This user's activity isn't available to you.",
  },
GLOBAL_UNAUTHENTICATED: {
title: "Sign in to view this",
body: "Sign in to view this user's activity.",
  },
GLOBAL_INTERNAL_ERROR: {
title: "Something went wrong on our end",
body: "We couldn't load the activity. Please try again.",
  },
};

const DEFAULT_COPY: ResolvedCopy = {
title: "We couldn't load this right now",
body: "Please try again.",
};

function resolveCopy(error: ApiError | null): ResolvedCopy {
if (error === null) return DEFAULT_COPY;
if (typeof error.code === "string" && error.code in COPY) {
return COPY[error.code]!;
  }
return DEFAULT_COPY;
}

export function ActivityErrorState({
error,
onRetry,
copyOverride,
}: ActivityErrorStateProps): ReactElement {

const copy =
copyOverride ??
(isActivityRateLimitCode(error?.code)
? {
title: "Activity is temporarily unavailable",
body: "The activity stream is rate-limited. Please wait and try again.",
        }
: resolveCopy(error));

return (
<div
role="alert"
aria-live="polite"
data-testid="activity-error-state"
data-error-code={error?.code ?? "unknown"}
data-is-rate-limit={isActivityRateLimitCode(error?.code) ? "true" : "false"}
className="flex flex-col gap-3 p-6"
    >
<div className="flex flex-col gap-1">
<p className="text-base font-semibold">{copy.title}</p>
<p className="text-sm text-muted-foreground">{copy.body}</p>
</div>
<button
type="button"
onClick={onRetry}
data-testid="activity-error-state-retry"
className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
Try again
      </button>
</div>
  );
}
