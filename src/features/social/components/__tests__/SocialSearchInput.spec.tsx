

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SocialSearchInput } from "@/features/social/components/SocialSearchInput";

const mockUseDebouncedValue = vi.fn();
const mockUseSearchRateLimit = vi.fn();

vi.mock("@/features/social/hooks/useDebouncedValue", () => ({
useDebouncedValue: (...args: unknown[]) => mockUseDebouncedValue(...args),
}));

vi.mock("@/features/social/hooks/useSearchRateLimit", () => ({
useSearchRateLimit: (...args: unknown[]) => mockUseSearchRateLimit(...args),
}));

const defaultDebounced = { debouncedValue: "", cancel: vi.fn() };
const defaultRateLimit = {
isRateLimited: false,
remainingSeconds: 0,
rateLimitedUntil: null as number | null,
onCooldownComplete: vi.fn(),
};

beforeEach(() => {
vi.clearAllMocks();
mockUseDebouncedValue.mockReturnValue(defaultDebounced);
mockUseSearchRateLimit.mockReturnValue(defaultRateLimit);
});

describe("SocialSearchInput", () => {
describe("controlled-value behaviour", () => {
it("renders input with the value prop", () => {
render(
<SocialSearchInput
value="alice"
onChange={vi.fn()}
cooldownSeconds={null}
surface="social-search-page"
        />,
      );

expect(screen.getByTestId("social-search-input-field")).toHaveValue("alice");
    });

it("renders with default aria-label", () => {
render(
<SocialSearchInput
value=""
onChange={vi.fn()}
cooldownSeconds={null}
surface="social-search-page"
        />,
      );

expect(screen.getByTestId("social-search-input-field")).toHaveAttribute(
"aria-label",
"Search",
      );
    });

it("renders with custom aria-label", () => {
render(
<SocialSearchInput
value=""
onChange={vi.fn()}
cooldownSeconds={null}
surface="social-search-page"
ariaLabel="Search people"
        />,
      );

expect(screen.getByTestId("social-search-input-field")).toHaveAttribute(
"aria-label",
"Search people",
      );
    });
  });

describe("debounce indicator", () => {
it("shows indicator when value differs from debounced value", async () => {

render(
<SocialSearchInput
value="alice"
onChange={vi.fn()}
cooldownSeconds={null}
surface="social-search-page"
        />,
      );

await waitFor(() => {
expect(screen.getByTestId("social-search-input-debounce-indicator")).toBeInTheDocument();
      });
    });

it("hides indicator when value matches debounced value", async () => {
mockUseDebouncedValue.mockReturnValueOnce({
debouncedValue: "alice",
cancel: vi.fn(),
      });

render(
<SocialSearchInput
value="alice"
onChange={vi.fn()}
cooldownSeconds={null}
surface="social-search-page"
        />,
      );

await waitFor(() => {
expect(
screen.queryByTestId("social-search-input-debounce-indicator"),
        ).not.toBeInTheDocument();
      });
    });
  });

describe("rate-limit state", () => {
it("renders with rate-limit hook returning isRateLimited=false", () => {

render(
<SocialSearchInput
value="alice"
onChange={vi.fn()}
cooldownSeconds={null}
surface="social-search-page"
        />,
      );

expect(screen.getByTestId("social-search-input-field")).not.toBeDisabled();
    });
  });

describe("data attributes", () => {
it("renders with correct surface data attribute", () => {
render(
<SocialSearchInput
value=""
onChange={vi.fn()}
cooldownSeconds={null}
surface="global-search-bar"
        />,
      );

expect(screen.getByTestId("social-search-input")).toHaveAttribute(
"data-surface",
"global-search-bar",
      );
    });

it("renders social-search-page surface correctly", () => {
render(
<SocialSearchInput
value=""
onChange={vi.fn()}
cooldownSeconds={null}
surface="social-search-page"
        />,
      );

expect(screen.getByTestId("social-search-input")).toHaveAttribute(
"data-surface",
"social-search-page",
      );
    });
  });
});
