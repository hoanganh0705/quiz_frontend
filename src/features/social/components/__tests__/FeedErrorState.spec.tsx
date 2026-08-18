

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeedErrorState } from "@/features/social/components/FeedErrorState";
import { ApiError } from "@/lib/api";

function makeApiError(args: {
code: string;
status?: number;
retryAfterMs?: number;
}): ApiError {
const { code, status = 403, retryAfterMs } = args;
const axiosLike = {
response: {
status,
statusText: code,
data: {
type: "about:blank",
title: code,
status,
detail: code,
extensions: {
code,
...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
        },
      },
    },
message: code,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
return new ApiError(axiosLike);
}

describe("FeedErrorState (TKT-6.9.F3)", () => {
it("renders the privacy branch for USER_PROFILE_PRIVATE", () => {
render(
<FeedErrorState
error={makeApiError({ code: "USER_PROFILE_PRIVATE" })}
onRetry={vi.fn()}
      />,
    );
const root = screen.getByTestId("feed-error-state");
expect(root.getAttribute("data-error-class")).toBe("privacy");
expect(root.textContent).toContain("not available");
  });

it("renders the privacy branch for SOCIAL_USER_BLOCKED", () => {
render(
<FeedErrorState
error={makeApiError({ code: "SOCIAL_USER_BLOCKED" })}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByTestId("feed-error-state").getAttribute("data-error-class")).toBe("privacy");
  });

it("renders the privacy branch for SOCIAL_BLOCKED_USER", () => {
render(
<FeedErrorState
error={makeApiError({ code: "SOCIAL_BLOCKED_USER" })}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByTestId("feed-error-state").getAttribute("data-error-class")).toBe("privacy");
  });

it("renders the privacy branch for SOCIAL_FRIEND_LIST_FORBIDDEN", () => {
render(
<FeedErrorState
error={makeApiError({ code: "SOCIAL_FRIEND_LIST_FORBIDDEN" })}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByTestId("feed-error-state").getAttribute("data-error-class")).toBe("privacy");
  });

it("renders the rate-limit branch for GLOBAL_RATE_LIMITED with a countdown", () => {
render(
<FeedErrorState
error={makeApiError({
code: "GLOBAL_RATE_LIMITED",
status: 429,
retryAfterMs: 3000,
        })}
onRetry={vi.fn()}
      />,
    );
const root = screen.getByTestId("feed-error-state");
expect(root.getAttribute("data-error-class")).toBe("rate_limit");
expect(root.getAttribute("data-seconds-remaining")).toBe("3");
expect(root.textContent).toMatch(/Try again in/);
  });

it("renders the sign-in CTA for GLOBAL_UNAUTHENTICATED with no retry button", () => {
render(
<FeedErrorState
error={makeApiError({ code: "GLOBAL_UNAUTHENTICATED", status: 401 })}
onRetry={vi.fn()}
      />,
    );
const root = screen.getByTestId("feed-error-state");
expect(root.getAttribute("data-error-class")).toBe("unauthenticated");
expect(screen.getByTestId("feed-error-state-sign-in")).toBeInTheDocument();
expect(screen.queryByTestId("feed-error-state-retry")).toBeNull();
  });

it("renders the retryable branch for GLOBAL_INTERNAL_ERROR", () => {
render(
<FeedErrorState
error={makeApiError({ code: "GLOBAL_INTERNAL_ERROR", status: 500 })}
onRetry={vi.fn()}
      />,
    );
const root = screen.getByTestId("feed-error-state");
expect(root.getAttribute("data-error-class")).toBe("retryable");
expect(screen.getByTestId("feed-error-state-retry")).toBeInTheDocument();
  });

it("renders the retryable branch for GLOBAL_NOT_FOUND", () => {
render(
<FeedErrorState
error={makeApiError({ code: "GLOBAL_NOT_FOUND", status: 404 })}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByTestId("feed-error-state").getAttribute("data-error-class")).toBe("retryable");
  });

it("renders the retryable branch for NETWORK_ERROR", () => {
render(
<FeedErrorState
error={makeApiError({ code: "NETWORK_ERROR", status: 0 })}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByTestId("feed-error-state").getAttribute("data-error-class")).toBe("retryable");
  });

it("renders the generic fallback for unknown codes", () => {
render(
<FeedErrorState
error={makeApiError({ code: "SOMETHING_UNKNOWN", status: 500 })}
onRetry={vi.fn()}
      />,
    );
const root = screen.getByTestId("feed-error-state");
expect(root.getAttribute("data-error-class")).toBe("generic");
expect(root.textContent).toContain("couldn't load the feed right now");
  });

it("renders the generic fallback when error is null", () => {
render(<FeedErrorState error={null} onRetry={vi.fn()} />);
const root = screen.getByTestId("feed-error-state");
expect(root.getAttribute("data-error-class")).toBe("generic");
expect(root.getAttribute("data-error-code")).toBe("unknown");
  });

it("disables the retry button during the rate-limit cooldown", () => {
render(
<FeedErrorState
error={makeApiError({
code: "GLOBAL_RATE_LIMITED",
status: 429,
retryAfterMs: 5000,
        })}
onRetry={vi.fn()}
      />,
    );
const retry = screen.getByTestId("feed-error-state-retry");
expect(retry.getAttribute("disabled")).not.toBeNull();
  });

it("calls onRetry when the retry button is clicked (non-rate-limit branch)", () => {
const onRetry = vi.fn();
render(
<FeedErrorState
error={makeApiError({ code: "GLOBAL_INTERNAL_ERROR", status: 500 })}
onRetry={onRetry}
      />,
    );
screen.getByTestId("feed-error-state-retry").click();
expect(onRetry).toHaveBeenCalledTimes(1);
  });

it("decrements the rate-limit countdown every second", () => {
vi.useFakeTimers();
try {
render(
<FeedErrorState
error={makeApiError({
code: "GLOBAL_RATE_LIMITED",
status: 429,
retryAfterMs: 3000,
          })}
onRetry={vi.fn()}
        />,
      );
const root = screen.getByTestId("feed-error-state");
expect(root.getAttribute("data-seconds-remaining")).toBe("3");
act(() => {
vi.advanceTimersByTime(1000);
      });
expect(screen.getByTestId("feed-error-state").getAttribute("data-seconds-remaining")).toBe("2");
    } finally {
vi.useRealTimers();
    }
  });

it("does not leak the HTTP status in the privacy branch user-visible copy", () => {
render(
<FeedErrorState
error={makeApiError({ code: "USER_PROFILE_PRIVATE", status: 403 })}
onRetry={vi.fn()}
      />,
    );
const root = screen.getByTestId("feed-error-state");
expect(root.textContent).not.toMatch(/Error 403/);
expect(root.textContent).not.toMatch(/403/);
  });
});