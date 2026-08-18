

import { describe, expect, it } from "vitest";

import {
ANALYTICS_DEFAULT_PERIOD,
ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS,
ANALYTICS_PERIOD_INVARIANTS,
ANALYTICS_PERIOD_URL_PARAM_KEY,
ANALYTICS_VALID_PERIODS,
coerceAnalyticsPeriod,
isAnalyticsPeriod,
} from "@/features/social/analytics-period-invariants";

describe("ANALYTICS_VALID_PERIODS", () => {
it("is exactly the documented week / month / all tuple", () => {
expect([...ANALYTICS_VALID_PERIODS]).toEqual(["week", "month", "all"]);
  });
});

describe("ANALYTICS_DEFAULT_PERIOD", () => {
it("is 'week'", () => {
expect(ANALYTICS_DEFAULT_PERIOD).toBe("week");
  });

it("is a member of the valid periods tuple", () => {
expect((ANALYTICS_VALID_PERIODS as readonly string[]).includes(ANALYTICS_DEFAULT_PERIOD)).toBe(true);
  });
});

describe("ANALYTICS_PERIOD_URL_PARAM_KEY", () => {
it("is 'period'", () => {
expect(ANALYTICS_PERIOD_URL_PARAM_KEY).toBe("period");
  });
});

describe("ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS", () => {
it("includes 'period'", () => {
expect(
(ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS as readonly string[]).includes("period"),
    ).toBe(true);
  });

it("does not include 'logout' or 'profile' (those are owned by the lifecycle-reset primitive)", () => {
expect(
(ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS as readonly string[]).includes("logout"),
    ).toBe(false);
expect(
(ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS as readonly string[]).includes("profile"),
    ).toBe(false);
  });
});

describe("isAnalyticsPeriod", () => {
it("returns true for each documented period", () => {
expect(isAnalyticsPeriod("week")).toBe(true);
expect(isAnalyticsPeriod("month")).toBe(true);
expect(isAnalyticsPeriod("all")).toBe(true);
  });

it("returns false for unknown strings", () => {
expect(isAnalyticsPeriod("year")).toBe(false);
expect(isAnalyticsPeriod("garbage")).toBe(false);
expect(isAnalyticsPeriod("")).toBe(false);
  });

it("returns false for non-string inputs", () => {
expect(isAnalyticsPeriod(null)).toBe(false);
expect(isAnalyticsPeriod(undefined)).toBe(false);
expect(isAnalyticsPeriod(123)).toBe(false);
expect(isAnalyticsPeriod({})).toBe(false);
  });
});

describe("coerceAnalyticsPeriod", () => {
it("returns the input when it is a valid period", () => {
expect(coerceAnalyticsPeriod("week")).toBe("week");
expect(coerceAnalyticsPeriod("month")).toBe("month");
expect(coerceAnalyticsPeriod("all")).toBe("all");
  });

it("falls back to the default for unknown strings", () => {
expect(coerceAnalyticsPeriod("year")).toBe(ANALYTICS_DEFAULT_PERIOD);
expect(coerceAnalyticsPeriod("garbage")).toBe(ANALYTICS_DEFAULT_PERIOD);
  });

it("falls back to the default for null / undefined / arrays", () => {
expect(coerceAnalyticsPeriod(null)).toBe(ANALYTICS_DEFAULT_PERIOD);
expect(coerceAnalyticsPeriod(undefined)).toBe(ANALYTICS_DEFAULT_PERIOD);
expect(coerceAnalyticsPeriod([])).toBe(ANALYTICS_DEFAULT_PERIOD);
expect(coerceAnalyticsPeriod(["week", "month"])).toBe(ANALYTICS_DEFAULT_PERIOD);
  });
});

describe("ANALYTICS_PERIOD_INVARIANTS", () => {
it("is frozen", () => {
expect(Object.isFrozen(ANALYTICS_PERIOD_INVARIANTS)).toBe(true);
  });

it("exposes every documented constant", () => {
expect(ANALYTICS_PERIOD_INVARIANTS.validPeriods).toBe(ANALYTICS_VALID_PERIODS);
expect(ANALYTICS_PERIOD_INVARIANTS.defaultPeriod).toBe(ANALYTICS_DEFAULT_PERIOD);
expect(ANALYTICS_PERIOD_INVARIANTS.urlParamKey).toBe(ANALYTICS_PERIOD_URL_PARAM_KEY);
expect(ANALYTICS_PERIOD_INVARIANTS.forbiddenScrollResetTriggers).toBe(
ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS,
    );
  });
});
