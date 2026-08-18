

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalyticsErrorState } from "@/features/social/components/AnalyticsErrorState";
import { ApiError } from "@/lib/api";

function makeApiError(status: number, code: string): ApiError {
const axiosLike = {
response: {
status,
statusText: code,
data: {
type: "about:blank",
title: code,
status,
detail: `test error ${code}`,
extensions: { code },
      },
    },
message: `test error ${code}`,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
return new ApiError(axiosLike);
}

describe("AnalyticsErrorState — code-specific copy", () => {
it("renders the SOCIAL_USER_NOT_FOUND copy", () => {
render(
<AnalyticsErrorState
error={makeApiError(404, "SOCIAL_USER_NOT_FOUND")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.textContent).toMatch(/We couldn't find this user/);
  });

it("renders the SOCIAL_FRIEND_LIST_FORBIDDEN copy", () => {
render(
<AnalyticsErrorState
error={makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.textContent).toMatch(/Only the user and their friends/);
  });

it("renders the SOCIAL_USER_BLOCKED privacy copy", () => {
render(
<AnalyticsErrorState
error={makeApiError(403, "SOCIAL_USER_BLOCKED")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.textContent).toMatch(/isn't available right now/);
  });

it("renders the SOCIAL_BLOCKED_USER privacy copy", () => {
render(
<AnalyticsErrorState
error={makeApiError(403, "SOCIAL_BLOCKED_USER")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.textContent).toMatch(/isn't available right now/);
  });

it("renders the GLOBAL_RATE_LIMITED copy for 429", () => {
render(
<AnalyticsErrorState
error={makeApiError(429, "GLOBAL_RATE_LIMITED")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.textContent).toMatch(/Slow down a moment/);
  });

it("renders the 5xx generic copy for GLOBAL_INTERNAL_ERROR", () => {
render(
<AnalyticsErrorState
error={makeApiError(500, "GLOBAL_INTERNAL_ERROR")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.textContent).toMatch(/Something went wrong on our end/);
  });

it("falls back to the default copy for an unrecognised error", () => {
render(
<AnalyticsErrorState
error={makeApiError(418, "SOME_OTHER_CODE")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.textContent).toMatch(/We couldn't load this right now/);
  });
});

describe("AnalyticsErrorState — stale marker", () => {
it("renders the stale marker when isStale is true", () => {
render(
<AnalyticsErrorState
error={makeApiError(500, "GLOBAL_INTERNAL_ERROR")}
isStale={true}
onRetry={() => undefined}
      />,
    );
expect(screen.getByTestId("analytics-error-stale-marker")).toBeInTheDocument();
  });

it("does not render the stale marker when isStale is false", () => {
render(
<AnalyticsErrorState
error={makeApiError(500, "GLOBAL_INTERNAL_ERROR")}
isStale={false}
onRetry={() => undefined}
      />,
    );
expect(
screen.queryByTestId("analytics-error-stale-marker"),
    ).not.toBeInTheDocument();
  });
});

describe("AnalyticsErrorState — retry", () => {
it("calls onRetry when the retry button is clicked", () => {
const onRetry = vi.fn();
render(
<AnalyticsErrorState
error={makeApiError(500, "GLOBAL_INTERNAL_ERROR")}
isStale={false}
onRetry={onRetry}
      />,
    );
const button = screen.getByTestId("analytics-error-retry");
fireEvent.click(button);
expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("AnalyticsErrorState — accessibility", () => {
it("uses role='alert' (it IS an error)", () => {
render(
<AnalyticsErrorState
error={makeApiError(500, "GLOBAL_INTERNAL_ERROR")}
isStale={false}
onRetry={() => undefined}
      />,
    );
const root = screen.getByTestId("analytics-error");
expect(root.getAttribute("role")).toBe("alert");
  });
});