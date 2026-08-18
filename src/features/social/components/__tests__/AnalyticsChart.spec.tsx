

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalyticsChart } from "@/features/social/components/AnalyticsChart";
import { ANALYTICS_ZERO_WIDGETS } from "@/features/social/analytics-zero-widget-catalog";

describe("AnalyticsChart — zero widgets", () => {
it("renders null for the first zero widget in the catalogue", () => {
const zeroId = ANALYTICS_ZERO_WIDGETS[0];
const { container } = render(
<AnalyticsChart
widget={{
id: zeroId,
value: 0,
label: "Zero widget",
description: "should not be visible",
        }}
      />,
    );
expect(container.firstChild).toBeNull();
  });

it("renders null for every entry in ANALYTICS_ZERO_WIDGETS", () => {
for (const id of ANALYTICS_ZERO_WIDGETS) {
const { container } = render(
<AnalyticsChart widget={{ id, value: 0, label: "Zero widget" }} />,
      );
expect(container.firstChild).toBeNull();
    }
  });

it("never renders role='alert' for zero widgets", () => {
const zeroId = ANALYTICS_ZERO_WIDGETS[0];
const { container } = render(
<AnalyticsChart widget={{ id: zeroId, value: 0, label: "Zero widget" }} />,
    );
expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});

describe("AnalyticsChart — non-zero widgets", () => {
it("renders the value, label, and description for a non-zero widget", () => {
render(
<AnalyticsChart
widget={{
id: "quizzes_published",
value: 12,
label: "Quizzes published",
description: "The number of quizzes you've published",
        }}
      />,
    );
const figure = screen.getByTestId("analytics-chart-quizzes_published");
expect(figure.getAttribute("aria-label")).toBe("Quizzes published");
expect(figure.textContent).toMatch(/12/);
expect(figure.textContent).toMatch(/Quizzes published/);
expect(figure.textContent).toMatch(/The number of quizzes you've published/);
  });

it("renders without an aria-describedby when no description is provided", () => {
render(
<AnalyticsChart
widget={{
id: "quizzes_published",
value: 5,
label: "Quizzes published",
        }}
      />,
    );
const figure = screen.getByTestId("analytics-chart-quizzes_published");
expect(figure.getAttribute("aria-describedby")).toBeNull();
  });

it("uses role='figure' for the root landmark", () => {
render(
<AnalyticsChart
widget={{
id: "quizzes_published",
value: 1,
label: "Quizzes published",
        }}
      />,
    );
const figure = screen.getByTestId("analytics-chart-quizzes_published");
expect(figure.getAttribute("role")).toBe("figure");
  });
});