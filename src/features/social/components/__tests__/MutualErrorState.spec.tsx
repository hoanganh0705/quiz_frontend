

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MutualErrorState } from "@/features/social/components/MutualErrorState";
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

describe("MutualErrorState", () => {
it("renders the documented copy for SOCIAL_USER_NOT_FOUND", () => {
render(
<MutualErrorState
error={makeApiError("SOCIAL_USER_NOT_FOUND", 404)}
onRetry={vi.fn()}
      />,
    );
const error = screen.getByTestId("mutual-error-state");
expect(error.textContent).toContain("This account is no longer available");
expect(error.getAttribute("data-error-code")).toBe("SOCIAL_USER_NOT_FOUND");
  });

it("renders the documented copy for SOCIAL_FRIEND_LIST_FORBIDDEN", () => {
render(
<MutualErrorState
error={makeApiError("SOCIAL_FRIEND_LIST_FORBIDDEN", 403)}
onRetry={vi.fn()}
      />,
    );
const error = screen.getByTestId("mutual-error-state");
expect(error.textContent).toContain("aren't available to you");
  });

it("renders the documented copy for SOCIAL_USER_BLOCKED", () => {
render(
<MutualErrorState
error={makeApiError("SOCIAL_USER_BLOCKED", 403)}
onRetry={vi.fn()}
      />,
    );
const error = screen.getByTestId("mutual-error-state");
expect(error.textContent).toContain("This user isn't available");
  });

it("falls back to the default copy for unknown codes", () => {
render(
<MutualErrorState
error={makeApiError("SOMETHING_UNKNOWN", 500)}
onRetry={vi.fn()}
      />,
    );
const error = screen.getByTestId("mutual-error-state");
expect(error.textContent).toContain("Something went wrong");
  });

it("falls back to the default copy when error is null", () => {
render(<MutualErrorState error={null} onRetry={vi.fn()} />);
const error = screen.getByTestId("mutual-error-state");
expect(error.textContent).toContain("Something went wrong");
expect(error.getAttribute("data-error-code")).toBe("unknown");
  });

it("calls onRetry when the retry button is clicked", () => {
const onRetry = vi.fn();
render(<MutualErrorState error={null} onRetry={onRetry} />);
screen.getByTestId("mutual-error-state-retry").click();
expect(onRetry).toHaveBeenCalledTimes(1);
  });

it("does not render the HTTP status in the user-visible copy", () => {
render(
<MutualErrorState
error={makeApiError("SOCIAL_USER_NOT_FOUND", 404)}
onRetry={vi.fn()}
      />,
    );
const error = screen.getByTestId("mutual-error-state");

expect(error.textContent).not.toMatch(/Error 404/);
  });
});
