

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalyticsPlaceholder } from "@/features/social/components/AnalyticsPlaceholder";

describe("AnalyticsPlaceholder — my-analytics", () => {
it("renders the documented title and description", () => {
render(<AnalyticsPlaceholder kind="my-analytics" />);
const root = screen.getByTestId("analytics-placeholder-my-analytics");
expect(root.textContent).toMatch(/My analytics/);
expect(root.textContent).toMatch(/weekly, monthly, and all-time numbers/);
  });

it("uses the documented aria-label suffix", () => {
render(<AnalyticsPlaceholder kind="my-analytics" />);
const root = screen.getByTestId("analytics-placeholder-my-analytics");
expect(root.getAttribute("aria-label")).toBe("My analytics (placeholder)");
  });
});

describe("AnalyticsPlaceholder — stats", () => {
it("renders the documented title and description", () => {
render(<AnalyticsPlaceholder kind="stats" />);
const root = screen.getByTestId("analytics-placeholder-stats");
expect(root.textContent).toMatch(/Stats/);
expect(root.textContent).toMatch(/public social stats/);
  });
});

describe("AnalyticsPlaceholder — leaderboard", () => {
it("renders the documented title and description", () => {
render(<AnalyticsPlaceholder kind="leaderboard" />);
const root = screen.getByTestId("analytics-placeholder-leaderboard");
expect(root.textContent).toMatch(/Friend leaderboard/);
expect(root.textContent).toMatch(/rank by XP/);
  });
});

describe("AnalyticsPlaceholder — static rendering", () => {
it("renders without any hook (no SWR, no service calls)", () => {

expect(() => {
render(<AnalyticsPlaceholder kind="my-analytics" />);
    }).not.toThrow();
  });
});