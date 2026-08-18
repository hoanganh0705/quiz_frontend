

import type { AnalyticsPeriod } from "@/features/social/types/analytics";

export const ANALYTICS_VALID_PERIODS = [
"week",
"month",
"all",
] as const satisfies readonly AnalyticsPeriod[];

export const ANALYTICS_DEFAULT_PERIOD: AnalyticsPeriod = "week";

export const ANALYTICS_PERIOD_URL_PARAM_KEY = "period" as const;

export const ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS = [
"period",
] as const;

export function isAnalyticsPeriod(
value: unknown,
): value is AnalyticsPeriod {
return (
typeof value === "string" &&
(ANALYTICS_VALID_PERIODS as readonly string[]).includes(value)
  );
}

export function coerceAnalyticsPeriod(
value: string | string[] | null | undefined,
): AnalyticsPeriod {
if (typeof value === "string" && isAnalyticsPeriod(value)) {
return value;
  }
return ANALYTICS_DEFAULT_PERIOD;
}

export const ANALYTICS_PERIOD_INVARIANTS = Object.freeze({
validPeriods: ANALYTICS_VALID_PERIODS,
defaultPeriod: ANALYTICS_DEFAULT_PERIOD,
urlParamKey: ANALYTICS_PERIOD_URL_PARAM_KEY,
forbiddenScrollResetTriggers: ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS,
});
