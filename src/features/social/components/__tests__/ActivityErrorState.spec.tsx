/**
 * `ActivityErrorState.spec.tsx` — Locks the activity error-state
 * contract (TKT-6.4.B4).
 *
 * Asserts:
 *
 *   - Renders code-specific copy for each documented code.
 *   - Falls back to the default copy for unknown codes.
 *   - **Does NOT** render the documented rate-limit branch — that
 *     is the dedicated `ActivityRateLimitNotice` (TKT-6.4.B3).
 *   - Calls `onRetry` when the retry button is clicked.
 *   - Does not leak HTTP status or relationship state.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActivityErrorState } from "@/features/social/components/ActivityErrorState";
import { ApiError } from "@/lib/api";

function makeApiError(code: string, status: number = 403): ApiError {
  const axiosLike = {
    response: {
      status,
      statusText: code,
      data: {
        type: "about:blank",
        title: code,
        status,
        detail: code,
        extensions: { code },
      },
    },
    message: code,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
  return new ApiError(axiosLike);
}

describe("ActivityErrorState", () => {
  it("renders the documented copy for SOCIAL_USER_NOT_FOUND", () => {
    render(
      <ActivityErrorState
        error={makeApiError("SOCIAL_USER_NOT_FOUND", 404)}
        onRetry={vi.fn()}
      />,
    );
    const error = screen.getByTestId("activity-error-state");
    expect(error.textContent).toContain("This account is no longer available");
    expect(error.getAttribute("data-error-code")).toBe("SOCIAL_USER_NOT_FOUND");
  });

  it("renders the documented copy for SOCIAL_USER_BLOCKED", () => {
    render(
      <ActivityErrorState
        error={makeApiError("SOCIAL_USER_BLOCKED", 403)}
        onRetry={vi.fn()}
      />,
    );
    const error = screen.getByTestId("activity-error-state");
    expect(error.textContent).toContain("This user isn't available");
  });

  it("falls back to the default copy for unknown codes", () => {
    render(
      <ActivityErrorState
        error={makeApiError("SOMETHING_UNKNOWN", 500)}
        onRetry={vi.fn()}
      />,
    );
    const error = screen.getByTestId("activity-error-state");
    expect(error.textContent).toContain("We couldn't load this right now");
  });

  it("falls back to the default copy when error is null", () => {
    render(<ActivityErrorState error={null} onRetry={vi.fn()} />);
    const error = screen.getByTestId("activity-error-state");
    expect(error.textContent).toContain("We couldn't load this right now");
    expect(error.getAttribute("data-error-code")).toBe("unknown");
  });

  it("does NOT render the rate-limit branch copy (that's the dedicated notice)", () => {
    render(
      <ActivityErrorState
        error={makeApiError("GLOBAL_RATE_LIMITED", 429)}
        onRetry={vi.fn()}
      />,
    );
    const error = screen.getByTestId("activity-error-state");
    // The error state marks the rate-limit branch but defers to
    // ActivityRateLimitNotice; the user-visible copy is the
    // generic "temporarily unavailable" copy.
    expect(error.getAttribute("data-is-rate-limit")).toBe("true");
    expect(error.textContent).toContain("temporarily unavailable");
  });

  it("calls onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ActivityErrorState error={null} onRetry={onRetry} />);
    screen.getByTestId("activity-error-state-retry").click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render the HTTP status in the user-visible copy", () => {
    render(
      <ActivityErrorState
        error={makeApiError("SOCIAL_USER_NOT_FOUND", 404)}
        onRetry={vi.fn()}
      />,
    );
    const error = screen.getByTestId("activity-error-state");
    expect(error.textContent).not.toMatch(/Error 404/);
  });
});
