"use client";

/**
 * `MutualErrorState` — Error-state component for the Story 6.4
 * mutual surfaces.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B4.
 *
 * ## What this component owns
 *
 * The error-state copy for the mutual surfaces. The component:
 *
 *   - Branches on `error.code` and renders code-specific copy.
 *   - **Never** leaks HTTP status or relationship state.
 *   - Exposes a retry button that calls `onRetry()`.
 *
 * The component intentionally does NOT render a rate-limit branch
 * — the mutual endpoints are not rate-limited in the documented
 * Phase 6 contract. The activity stream carries the rate-limit
 * notice (TKT-6.4.B3).
 *
 * ## Why a Client Component
 *
 * The retry button requires a click handler. The rest of the
 * markup is server-renderable.
 */

import { type ReactElement } from "react";

import type { ApiError } from "@/lib/api";

interface MutualErrorStateProps {
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
  SOCIAL_FRIEND_LIST_FORBIDDEN: {
    title: "Not available",
    body: "This user's mutual connections aren't available to you.",
  },
  SOCIAL_USER_BLOCKED: {
    title: "This user isn't available",
    body: "This user's activity isn't available to you.",
  },
  SOCIAL_BLOCKED_USER: {
    title: "This user isn't available",
    body: "This user's activity isn't available to you.",
  },
};

const DEFAULT_COPY: ResolvedCopy = {
  title: "Something went wrong",
  body: "We couldn't load the mutual connections. Please try again.",
};

function resolveCopy(error: ApiError | null): ResolvedCopy {
  if (error === null) return DEFAULT_COPY;
  if (typeof error.code === "string" && error.code in COPY) {
    return COPY[error.code]!;
  }
  return DEFAULT_COPY;
}

export function MutualErrorState({
  error,
  onRetry,
  copyOverride,
}: MutualErrorStateProps): ReactElement {
  const copy = copyOverride ?? resolveCopy(error);
  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="mutual-error-state"
      data-error-code={error?.code ?? "unknown"}
      className="flex flex-col gap-3 p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">{copy.title}</p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        data-testid="mutual-error-state-retry"
        className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </div>
  );
}
