

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SocialListErrorState } from "@/features/social/components/SocialListErrorState";
import type { ApiError } from "@/lib/api";
import type { ErrorCode } from "@/lib/api/error-codes";

function makeApiError(code: ErrorCode, status: number): ApiError {
const err = new Error("test") as ApiError;
Object.defineProperty(err, "code", { value: code, configurable: true });
Object.defineProperty(err, "status", { value: status, configurable: true });
return err;
}

describe("SocialListErrorState", () => {
it("renders the USER_NOT_FOUND override", () => {
const error = makeApiError("USER_NOT_FOUND", 404);
render(
<SocialListErrorState
error={error}
isStale={false}
onRetry={() => {}}
      />,
    );
const root = screen.getByTestId("social-list-error-state");
expect(root.textContent).toMatch(/This account is no longer available/);
  });

it("renders the SOCIAL_FRIEND_LIST_FORBIDDEN override", () => {
const error = makeApiError("SOCIAL_FRIEND_LIST_FORBIDDEN", 403);
render(
<SocialListErrorState
error={error}
isStale={false}
onRetry={() => {}}
      />,
    );
const root = screen.getByTestId("social-list-error-state");
expect(root.textContent).toMatch(/Not available/);
expect(root.textContent).toMatch(/isn't available to you/);
  });

it("renders the rate-limit hint on GLOBAL_RATE_LIMITED", () => {
const error = makeApiError("GLOBAL_RATE_LIMITED", 429);
render(
<SocialListErrorState
error={error}
isStale={false}
onRetry={() => {}}
      />,
    );
expect(screen.getByTestId("social-list-error-state").textContent).toMatch(
/You're going too fast/,
    );
  });

it("renders the 'try again in a moment' hint on 5xx", () => {
const error = makeApiError("GLOBAL_INTERNAL_ERROR", 500);
render(
<SocialListErrorState
error={error}
isStale={false}
onRetry={() => {}}
      />,
    );
expect(screen.getByTestId("social-list-error-state").textContent).toMatch(
/try again in a moment/i,
    );
  });

it("renders the stale marker when isStale is true", () => {
const error = makeApiError("GLOBAL_INTERNAL_ERROR", 500);
render(
<SocialListErrorState
error={error}
isStale
onRetry={() => {}}
      />,
    );
expect(
screen.getByTestId("social-list-error-state-stale-marker"),
    ).toBeInTheDocument();
  });

it("does not render the stale marker when isStale is false", () => {
const error = makeApiError("GLOBAL_INTERNAL_ERROR", 500);
render(
<SocialListErrorState
error={error}
isStale={false}
onRetry={() => {}}
      />,
    );
expect(
screen.queryByTestId("social-list-error-state-stale-marker"),
    ).toBeNull();
  });

it("invokes onRetry when the retry button is clicked", () => {
const error = makeApiError("GLOBAL_INTERNAL_ERROR", 500);
const onRetry = vi.fn();
render(
<SocialListErrorState
error={error}
isStale={false}
onRetry={onRetry}
      />,
    );
fireEvent.click(screen.getByTestId("social-list-error-state-retry"));
expect(onRetry).toHaveBeenCalledTimes(1);
  });

it("renders a generic message when error is null", () => {
render(
<SocialListErrorState
error={null}
isStale={false}
onRetry={() => {}}
      />,
    );
const root = screen.getByTestId("social-list-error-state");
expect(root.textContent).toMatch(/Something went wrong/);
expect(root.getAttribute("data-error-code")).toBe("unknown");
  });
});