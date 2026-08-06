/**
 * `analytics-period-invariants.ts` — Cross-batch invariants for the
 * `/social/me/analytics` period discriminator.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.A3.
 *
 * ## Purpose
 *
 * Single source of truth for the period-discriminator contract every
 * Story 6.3 hook and component must obey. Importing this module from
 * `usePeriodFilter`, the My Analytics page, the `AnalyticsPeriodFilter`
 * primitive, and the analytics-zero widget catalogue is the canonical
 * way to assert compliance without sprinkling magic strings across
 * the surface.
 *
 * ## What this file owns
 *
 *   1. **Valid periods.** The period discriminator is one of
 *      `'week' | 'month' | 'all'`. The set is exported as a frozen
 *      tuple so the analytics hook (`useMySocialAnalytics`) can
 *      narrow its `period` argument without stringly-typed switches.
 *
 *   2. **Default period.** `'week'` — the My Analytics page surfaces
 *      "this week" as the landing state. An unknown URL value (e.g.
 *      `?period=garbage`) falls back to this default rather than
 *      surfacing an error.
 *
 *   3. **URL param key.** `'period'` — the URL is the single source
 *      of truth; component state never overrides it. The My Analytics
 *      page consumes the period via `usePeriodFilter()` exclusively;
 *      no other key is recognised.
 *
 *   4. **Forbidden scroll-reset triggers.** A period change must NOT
 *      reset scroll position (Story 6.3 Exit Criterion #5). The list
 *      of forbidden triggers is exported so the cross-batch validation
 *      checklist can grep for `window.scrollTo` regressions on
 *      period-change code paths. Logout and profile change reset
 *      behaviour is owned separately by the Epic 6.2
 *      `useSocialListLifecycleReset` primitive (TKT-6.2.B4).
 *
 * ## What this file does NOT own
 *
 *   - The `usePeriodFilter` hook itself — that lives in
 *     `features/social/hooks/usePeriodFilter.ts` (TKT-6.3.B4).
 *   - The `AnalyticsPeriodFilter` component — that lives in
 *     `features/social/components/AnalyticsPeriodFilter.tsx`
 *     (TKT-6.3.F1).
 *   - The My Analytics page — that lives in
 *     `features/social/lists/MyAnalyticsPage.tsx` (TKT-6.3.F2).
 *
 * ## SSR-safety
 *
 * The module reads no `window`, `localStorage`, or other browser-only
 * API. It is safe to import from Server Components and from the App
 * Router's route modules.
 */

import type { AnalyticsPeriod } from "@/features/social/types/analytics";

/**
 * The closed set of valid period values for `/social/me/analytics`.
 *
 * Mirrors the backend's documented period discriminator and the
 * `AnalyticsPeriod` union declared in
 * `features/social/types/analytics.ts`. The constant is typed as
 * the `AnalyticsPeriod` discriminated union member so an accidental
 * drift (e.g. adding `'year'`) is a type error until the union is
 * updated first.
 */
export const ANALYTICS_VALID_PERIODS = [
  "week",
  "month",
  "all",
] as const satisfies readonly AnalyticsPeriod[];

/**
 * The default period used by `usePeriodFilter` when the URL has no
 * `?period` param, or when the param is present but unrecognised.
 *
 * "This week" is the documented landing state for the My Analytics
 * deep-dive (Story 6.3 line 195: "Period filter state is owned by
 * the URL").
 */
export const ANALYTICS_DEFAULT_PERIOD: AnalyticsPeriod = "week";

/**
 * The URL search-param key that owns the period discriminator.
 *
 * The My Analytics page reads the period exclusively from this URL
 * key via `usePeriodFilter()`. Any other key in the URL on
 * `/social/me/analytics` is treated as unrelated (e.g. a `?q=`
 * search param the user navigated in with).
 */
export const ANALYTICS_PERIOD_URL_PARAM_KEY = "period" as const;

/**
 * The list of triggers that MUST NOT reset scroll position when the
 * My Analytics page revalidates.
 *
 * A period change revalidates the analytics data (Story 6.3 Exit
 * Criterion #5) but does NOT reset scroll — the user expects to stay
 * anchored to the chart they were looking at when they flipped the
 * filter. The same invariant is checked by the cross-batch validation
 * checklist (`grep -RE "window\\.scrollTo\\("` against
 * `usePeriodFilter.ts`, `AnalyticsPeriodFilter.tsx`,
 * `MyAnalyticsPage.tsx`).
 *
 * Logout and profile change reset are NOT on this list — they are
 * explicit lifecycle transitions owned by the Epic 6.2
 * `useSocialListLifecycleReset` primitive (TKT-6.2.B4) and the
 * Story 6.3 `useSocialLifecycleReset` hook (TKT-6.3.B5). Resetting
 * scroll on logout is correct (a logged-out viewer should land on
 * the top of the page), and resetting on profile change is the
 * Epic 6.2 list-page convention.
 */
export const ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS = [
  "period",
] as const;

/**
 * Type-guard: returns `true` when the input is a member of
 * `ANALYTICS_VALID_PERIODS`.
 *
 * Used by `usePeriodFilter` (TKT-6.3.B4) to validate the URL value
 * and fall back to `ANALYTICS_DEFAULT_PERIOD` on miss. The guard is
 * the only public coercion surface — no other helper is permitted to
 * "narrow" a stringly-typed value to `AnalyticsPeriod`.
 */
export function isAnalyticsPeriod(
  value: unknown,
): value is AnalyticsPeriod {
  return (
    typeof value === "string" &&
    (ANALYTICS_VALID_PERIODS as readonly string[]).includes(value)
  );
}

/**
 * Coerce a raw URL value to an `AnalyticsPeriod`, falling back to
 * `ANALYTICS_DEFAULT_PERIOD` on miss.
 *
 * Used by `usePeriodFilter` when reading the URL: an unknown value
 * (e.g. `?period=garbage`, a typo, or a value injected by a
 * third-party bookmarklet) is treated as "no value" rather than
 * "error". The default re-asserts the documented landing state.
 */
export function coerceAnalyticsPeriod(
  value: string | string[] | null | undefined,
): AnalyticsPeriod {
  if (typeof value === "string" && isAnalyticsPeriod(value)) {
    return value;
  }
  return ANALYTICS_DEFAULT_PERIOD;
}

/**
 * Read-only record exposing every constant in this module. Re-exported
 * from `@/features/social` so list components can read
 * `ANALYTICS_PERIOD_INVARIANTS.defaultPeriod` without needing to
 * remember the exact identifier.
 */
export const ANALYTICS_PERIOD_INVARIANTS = Object.freeze({
  validPeriods: ANALYTICS_VALID_PERIODS,
  defaultPeriod: ANALYTICS_DEFAULT_PERIOD,
  urlParamKey: ANALYTICS_PERIOD_URL_PARAM_KEY,
  forbiddenScrollResetTriggers: ANALYTICS_FORBIDDEN_SCROLL_RESET_TRIGGERS,
});
