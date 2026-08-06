/**
 * `AnalyticsEmptyState.spec.tsx` — Locks the empty-state copy
 * (TKT-6.3.C3).
 *
 * Asserts:
 *
 *   - `kind: 'my-analytics'` renders distinct copy per period.
 *   - `kind: 'stats'` / `'leaderboard'` render kind-specific copy.
 *   - The empty state uses `role="status"` (lag is informational,
 *     not an error).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalyticsEmptyState } from "@/features/social/components/AnalyticsEmptyState";

describe("AnalyticsEmptyState — my-analytics", () => {
  it("renders the 'this week' copy when period is 'week'", () => {
    render(<AnalyticsEmptyState kind="my-analytics" period="week" />);
    const root = screen.getByTestId("analytics-empty-my-analytics-week");
    expect(root.textContent).toMatch(/No activity this week/);
  });

  it("renders the 'this month' copy when period is 'month'", () => {
    render(<AnalyticsEmptyState kind="my-analytics" period="month" />);
    const root = screen.getByTestId("analytics-empty-my-analytics-month");
    expect(root.textContent).toMatch(/No activity this month/);
  });

  it("renders the 'all time' copy when period is 'all'", () => {
    render(<AnalyticsEmptyState kind="my-analytics" period="all" />);
    const root = screen.getByTestId("analytics-empty-my-analytics-all");
    expect(root.textContent).toMatch(/No activity recorded/);
  });

  it("falls back to the generic title when period is absent", () => {
    render(<AnalyticsEmptyState kind="my-analytics" />);
    const root = screen.getByTestId("analytics-empty-my-analytics");
    expect(root.textContent).toMatch(/Nothing to show/);
    expect(root.textContent).toMatch(/Once you start using the social features/);
  });
});

describe("AnalyticsEmptyState — other kinds", () => {
  it("renders the stats-specific copy", () => {
    render(<AnalyticsEmptyState kind="stats" />);
    const root = screen.getByTestId("analytics-empty-stats");
    expect(root.textContent).toMatch(/hasn't shared any public social stats/);
  });

  it("renders the leaderboard-specific copy", () => {
    render(<AnalyticsEmptyState kind="leaderboard" />);
    const root = screen.getByTestId("analytics-empty-leaderboard");
    expect(root.textContent).toMatch(/leaderboard will populate here/);
  });
});

describe("AnalyticsEmptyState — accessibility", () => {
  it("uses role='status' (informational, not an error)", () => {
    render(<AnalyticsEmptyState kind="stats" />);
    const root = screen.getByTestId("analytics-empty-stats");
    expect(root.getAttribute("role")).toBe("status");
  });
});