"use client";

/**
 * `FeedErrorState` — Error-state primitive for the Story 6.9
 * global feed.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.F3.
 *
 * ## What this component owns
 *
 * The error-state copy for the global feed. The component:
 *
 *   - Maps `USER_PROFILE_PRIVATE`, `SOCIAL_USER_BLOCKED`,
 *     `SOCIAL_BLOCKED_USER`, `SOCIAL_FRIEND_LIST_FORBIDDEN` to a
 *     privacy notice.
 *   - Maps `GLOBAL_RATE_LIMITED` to a rate-limit notice with a
 *     countdown timer.
 *   - Maps `GLOBAL_UNAUTHENTICATED` to a sign-in CTA.
 *   - Maps `GLOBAL_INTERNAL_ERROR`, `GLOBAL_NOT_FOUND`,
 *     `NETWORK_ERROR` to a retry-per-panel affordance.
 *   - Does NOT auto-retry on rate-limit (per the Story 6.9
 *     Validation Rules).
 *   - Renders a generic fallback for unknown codes.
 *
 * ## Why a Client Component
 *
 * The countdown under the rate-limit branch uses `setTimeout` and
 * `useEffect` to drive the "try again in N seconds" copy. The
 * rest of the markup is server-renderable.
 *
 * ## SSR-safety
 *
 * The component uses `useEffect` (which never runs on the server)
 * so the initial render is identical on server and client. The
 * countdown updates only after mount.
 */

import NextLink from "next/link";
import { useEffect, useState, type ReactElement } from "react";

import { ApiError } from "@/lib/api";
import { decodeRateLimit } from "@/features/social/rate-limit-decoder";

export interface FeedErrorStateProps {
  /** The error to render. May be `null` for an unknown-shape error. */
  readonly error: ApiError | null;
  /** Retry callback invoked when the user clicks the retry button. */
  readonly onRetry: () => void;
}

type ErrorClass =
  | "privacy"
  | "rate_limit"
  | "unauthenticated"
  | "retryable"
  | "generic";

function classifyError(code: string | undefined): ErrorClass {
  if (!code) return "generic";
  switch (code) {
    case "USER_PROFILE_PRIVATE":
    case "SOCIAL_USER_BLOCKED":
    case "SOCIAL_BLOCKED_USER":
    case "SOCIAL_FRIEND_LIST_FORBIDDEN":
      return "privacy";
    case "GLOBAL_RATE_LIMITED":
      return "rate_limit";
    case "GLOBAL_UNAUTHENTICATED":
      return "unauthenticated";
    case "GLOBAL_INTERNAL_ERROR":
    case "GLOBAL_NOT_FOUND":
    case "NETWORK_ERROR":
      return "retryable";
    default:
      return "generic";
  }
}

const GENERIC_COPY = {
  title: "We couldn't load the feed right now",
  body: "Please try again in a moment.",
} as const;

const UNAUTHENTICATED_COPY = {
  title: "Sign in to view the feed",
  body: "Sign in to see recent activity from the community.",
} as const;

const RETRYABLE_COPY = {
  title: "We couldn't load the feed right now",
  body: "Please check your connection and try again.",
} as const;

const PRIVACY_COPY = {
  title: "This feed is not available",
  body: "Some items are hidden because of a privacy or block setting.",
} as const;

export function FeedErrorState({
  error,
  onRetry,
}: FeedErrorStateProps): ReactElement {
  const errorClass = classifyError(error?.code);

  // ── Rate-limit branch ────────────────────────────────────────────────
  const decoded = decodeRateLimit(error);
  const initialCooldown = decoded.cooldownSeconds ?? 0;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    Math.max(0, Math.floor(initialCooldown)),
  );

  useEffect(() => {
    // When the error signal changes, reset the countdown.
    setSecondsRemaining(Math.max(0, Math.floor(initialCooldown)));
  }, [initialCooldown]);

  useEffect(() => {
    if (errorClass !== "rate_limit") return;
    if (secondsRemaining <= 0) return;
    const timer = setTimeout(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1_000);
    return () => clearTimeout(timer);
  }, [secondsRemaining, errorClass]);

  const retryDisabled = errorClass === "rate_limit" && secondsRemaining > 0;

  // ── Render ──────────────────────────────────────────────────────────
  if (errorClass === "privacy") {
    return (
      <section
        role="alert"
        aria-label={PRIVACY_COPY.title}
        data-testid="feed-error-state"
        data-error-class="privacy"
        data-error-code={error?.code ?? "unknown"}
        className="flex flex-col gap-2 p-6 rounded-md border border-border"
      >
        <p className="text-base font-semibold">{PRIVACY_COPY.title}</p>
        <p className="text-sm text-muted-foreground">{PRIVACY_COPY.body}</p>
      </section>
    );
  }

  if (errorClass === "unauthenticated") {
    return (
      <section
        role="alert"
        aria-label={UNAUTHENTICATED_COPY.title}
        data-testid="feed-error-state"
        data-error-class="unauthenticated"
        data-error-code={error?.code ?? "unknown"}
        className="flex flex-col gap-3 p-6 rounded-md border border-border"
      >
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">{UNAUTHENTICATED_COPY.title}</p>
          <p className="text-sm text-muted-foreground">{UNAUTHENTICATED_COPY.body}</p>
        </div>
        <NextLink
          href="/login"
          data-testid="feed-error-state-sign-in"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in
        </NextLink>
      </section>
    );
  }

  if (errorClass === "rate_limit") {
    const copy =
      secondsRemaining > 0
        ? `Try again in ${secondsRemaining} second${secondsRemaining === 1 ? "" : "s"}.`
        : "You can try again now.";
    return (
      <section
        role="alert"
        aria-live="polite"
        aria-label="Feed is rate-limited"
        data-testid="feed-error-state"
        data-error-class="rate_limit"
        data-error-code={error?.code ?? "unknown"}
        data-seconds-remaining={secondsRemaining}
        className="flex flex-col gap-3 p-6 rounded-md border border-amber-300 bg-amber-50 text-amber-900"
      >
        <p className="text-sm font-medium">{copy}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retryDisabled}
          aria-label="Try again"
          data-testid="feed-error-state-retry"
          className="self-start rounded-md border border-amber-300 bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Try again
        </button>
      </section>
    );
  }

  if (errorClass === "retryable") {
    return (
      <section
        role="alert"
        aria-label={RETRYABLE_COPY.title}
        data-testid="feed-error-state"
        data-error-class="retryable"
        data-error-code={error?.code ?? "unknown"}
        className="flex flex-col gap-3 p-6 rounded-md border border-border"
      >
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">{RETRYABLE_COPY.title}</p>
          <p className="text-sm text-muted-foreground">{RETRYABLE_COPY.body}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          aria-label="Try again"
          data-testid="feed-error-state-retry"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      </section>
    );
  }

  // Generic fallback (also covers `error === null`).
  return (
    <section
      role="alert"
      aria-label={GENERIC_COPY.title}
      data-testid="feed-error-state"
      data-error-class="generic"
      data-error-code={error?.code ?? "unknown"}
      className="flex flex-col gap-3 p-6 rounded-md border border-border"
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">{GENERIC_COPY.title}</p>
        <p className="text-sm text-muted-foreground">{GENERIC_COPY.body}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Try again"
        data-testid="feed-error-state-retry"
        className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </section>
  );
}