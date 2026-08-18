

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchErrorState } from "@/features/social/components/SearchErrorState";

describe("SearchErrorState", () => {
it("renders GLOBAL_UNAUTHENTICATED copy", () => {
render(<SearchErrorState errorCode="GLOBAL_UNAUTHENTICATED" />);
const error = screen.getByTestId("search-error-state");
expect(error.textContent).toContain("Sign in required");
expect(error.getAttribute("data-error-code")).toBe("GLOBAL_UNAUTHENTICATED");
  });

it("renders GLOBAL_FORBIDDEN copy", () => {
render(<SearchErrorState errorCode="GLOBAL_FORBIDDEN" />);
const error = screen.getByTestId("search-error-state");
expect(error.textContent).toContain("Access denied");
  });

it("renders GLOBAL_NOT_FOUND copy", () => {
render(<SearchErrorState errorCode="GLOBAL_NOT_FOUND" />);
const error = screen.getByTestId("search-error-state");
expect(error.textContent).toContain("Not found");
  });

it("renders GLOBAL_INTERNAL_ERROR copy", () => {
render(<SearchErrorState errorCode="GLOBAL_INTERNAL_ERROR" />);
const error = screen.getByTestId("search-error-state");
expect(error.textContent).toContain("Something went wrong");
  });

it("renders GLOBAL_BAD_REQUEST copy", () => {
render(<SearchErrorState errorCode="GLOBAL_BAD_REQUEST" />);
const error = screen.getByTestId("search-error-state");
expect(error.textContent).toContain("Invalid search");
  });

it("renders GLOBAL_VALIDATION_FAILED copy", () => {
render(<SearchErrorState errorCode="GLOBAL_VALIDATION_FAILED" />);
const error = screen.getByTestId("search-error-state");
expect(error.textContent).toContain("Invalid search");
  });

it("renders a retry button when onRetry is provided", () => {
const onRetry = vi.fn();
render(<SearchErrorState errorCode="GLOBAL_INTERNAL_ERROR" onRetry={onRetry} />);
const retry = screen.getByTestId("search-error-retry");
expect(retry).toBeInTheDocument();
  });

it("does not render a retry button when onRetry is omitted", () => {
render(<SearchErrorState errorCode="GLOBAL_INTERNAL_ERROR" />);
expect(screen.queryByTestId("search-error-retry")).toBeNull();
  });

it("renders the server error fallback for unknown codes", () => {
render(
<SearchErrorState

errorCode="UNKNOWN_CODE"
      />,
    );
const error = screen.getByTestId("search-error-state");
expect(error.textContent).toContain("Something went wrong");
  });
});
