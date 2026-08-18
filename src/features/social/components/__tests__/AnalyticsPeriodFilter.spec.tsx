

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSetPeriod = vi.fn();
const mockPeriod = vi.fn<() => "week" | "month" | "all">();

vi.mock("@/features/social/hooks/usePeriodFilter", () => ({
usePeriodFilter: () => ({
period: mockPeriod(),
isValid: true,
setPeriod: mockSetPeriod,
reset: () => undefined,
  }),
}));

const scrollToSpy = vi.fn();
const originalScrollTo = window.scrollTo;

beforeEach(() => {
mockSetPeriod.mockClear();
scrollToSpy.mockClear();

window.scrollTo = ((...args: unknown[]) => {
scrollToSpy(...args);
  }) as typeof window.scrollTo;
mockPeriod.mockReturnValue("week");
});

afterEach(() => {
window.scrollTo = originalScrollTo;
});

import { AnalyticsPeriodFilter } from "@/features/social/components/AnalyticsPeriodFilter";

describe("AnalyticsPeriodFilter — render", () => {
it("renders all three documented options", () => {
render(<AnalyticsPeriodFilter />);
expect(
screen.getByTestId("analytics-period-filter-option-week"),
    ).toBeInTheDocument();
expect(
screen.getByTestId("analytics-period-filter-option-month"),
    ).toBeInTheDocument();
expect(
screen.getByTestId("analytics-period-filter-option-all"),
    ).toBeInTheDocument();
  });

it("exposes the current period via data-current-period", () => {
mockPeriod.mockReturnValue("month");
render(<AnalyticsPeriodFilter />);
const root = screen.getByTestId("analytics-period-filter");
expect(root.getAttribute("data-current-period")).toBe("month");
  });

it("marks the current option as selected and aria-checked", () => {
mockPeriod.mockReturnValue("month");
render(<AnalyticsPeriodFilter />);
const monthOption = screen.getByTestId(
"analytics-period-filter-option-month",
    );
expect(monthOption.getAttribute("aria-checked")).toBe("true");
expect(monthOption.getAttribute("data-current")).toBe("true");
const weekOption = screen.getByTestId(
"analytics-period-filter-option-week",
    );
expect(weekOption.getAttribute("aria-checked")).toBe("false");
expect(weekOption.getAttribute("data-current")).toBe("false");
  });

it("uses the default labels from ANALYTICS_PERIOD_LABELS", () => {
render(<AnalyticsPeriodFilter />);
expect(screen.getByText("This week")).toBeInTheDocument();
expect(screen.getByText("This month")).toBeInTheDocument();
expect(screen.getByText("All time")).toBeInTheDocument();
  });

it("honours per-period label overrides", () => {
render(<AnalyticsPeriodFilter labels={{ week: "Past 7 days" }} />);
expect(screen.getByText("Past 7 days")).toBeInTheDocument();
expect(screen.getByText("This month")).toBeInTheDocument();
  });
});

describe("AnalyticsPeriodFilter — behaviour", () => {
it("calls setPeriod when a different option is clicked", () => {
mockPeriod.mockReturnValue("week");
render(<AnalyticsPeriodFilter />);
fireEvent.click(
screen.getByTestId("analytics-period-filter-option-month"),
    );
expect(mockSetPeriod).toHaveBeenCalledWith("month");
  });

it("calls setPeriod for the all option", () => {
mockPeriod.mockReturnValue("week");
render(<AnalyticsPeriodFilter />);
fireEvent.click(
screen.getByTestId("analytics-period-filter-option-all"),
    );
expect(mockSetPeriod).toHaveBeenCalledWith("all");
  });

it("does not call window.scrollTo on period change (cross-batch invariant)", () => {
mockPeriod.mockReturnValue("week");
render(<AnalyticsPeriodFilter />);
fireEvent.click(
screen.getByTestId("analytics-period-filter-option-month"),
    );
expect(scrollToSpy).not.toHaveBeenCalled();
  });
});