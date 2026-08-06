"use client";

/**
 * `ActivityErrorState` — Error-state component for the Story 6.4
 * per-user activity stream.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B4.
 *
 * ## What this component owns
 *
 * The error-state copy for the activity stream. The component:
 *
 *   - Branches on `error.code` and renders code-specific copy.
 *   - **Never** renders the rate-limit branch — that is the
 *     dedicated `ActivityRateLimitNotice` (TKT-6.4.B3). The two
 *     surfaces are intentionally separate so the user gets the
 *     "try again in N seconds" CTA on the rate-limit path.
 *   - **Never** leaks HTTP status or relationship state.
 *   - Exposes a retry button that calls `onRetry()`.
 *
 * ## Why a Client Component
 *
 * The retry button requires a click handler. The rest of the
 * markup is server-renderable.
 */

import { type ReactElement } from "react";

import { isActivityRateLimitCode } from "@/features/social/activity-discriminator";

import type { ApiError } from "@/lib/api";

interface ActivityErrorStateProps {
  /** The error to render. May be `null` for an unknown-shape error. */
  error: ApiError | null;
  /** Retry callback invoked when the user clicks the retry button. */
  onRetry: () => void;
  /** Optional copy override used in tests. */
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
  // The rate-limit branch is intentionally delegated to
  // `ActivityRateLimitNotice` (TKT-6.4.B3). When the error is a
  // rate-limit error, we render a generic copy here that defers
  // to the rate-limit notice the page composes separately.
  // The co-located spec asserts that the rate-limit code is NOT
  // rendered with the dedicated copy.
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
