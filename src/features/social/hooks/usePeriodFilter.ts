"use client";

/**
 * `usePeriodFilter` — URL-owned period state for `/social/me/analytics`
 * (and any future period-filtered analytics surface) that preserves
 * scroll position on period change.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.B4.
 *
 * ## What this hook owns
 *
 * The URL state for every Story 6.3 analytics surface that
 * paginates by period. The period discriminator lives in the URL
 * (`?period=...`) as the single source of truth — component state
 * never overrides it. The hook abstracts `useRouter` /
 * `useSearchParams` / `usePathname` so the analytics pages stay
 * declarative.
 *
 * `period` is the only URL key this surface writes; any other key
 * is left untouched. The `period` value is one of
 * `'week' | 'month' | 'all'` (the `AnalyticsPeriod` union) and the
 * default is `'week'`. Unknown URL values fall back to the default
 * so a typo or a third-party bookmarklet cannot crash the page.
 *
 * ## Lifecycle invariants
 *
 *   - **Default.** When the URL has no `?period` param (or has an
 *     unrecognised value), `period` is `ANALYTICS_DEFAULT_PERIOD`
 *     (`'week'`).
 *   - **Scroll preservation.** `setPeriod(p)` updates the URL via
 *     `router.replace(next, { scroll: false })` (the same primitive
 *     Epic 6.2 established in `useSocialListUrlState`). The hook
 *     MUST NOT call `window.scrollTo` on period change — the
 *     cross-batch validation checklist (TKT-6.3) greps for that
 *     regression.
 *   - **Logout reset.** `reset()` removes the `?period` param. It is
 *     called by the Story 6.3 `useSocialLifecycleReset` primitive
 *     (TKT-6.3.B5) on logout events when the viewer is on
 *     `/social/me/analytics`.
 *
 * ## SSR-safety
 *
 * The hook reads from `useSearchParams()`. In the Next.js App Router
 * `useSearchParams` is client-only — the consumers of this hook are
 * client components (the My Analytics page), so the constraint is
 * met.
 *
 * @example
 *   const { period, setPeriod, isValid, reset } = usePeriodFilter();
 *   const { data } = useMySocialAnalytics(period);
 *   ...
 *   <select value={period} onChange={(e) => setPeriod(e.target.value)}>
 *     <option value="week">This week</option>
 *     <option value="month">This month</option>
 *     <option value="all">All time</option>
 *   </select>
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  ANALYTICS_DEFAULT_PERIOD,
  ANALYTICS_PERIOD_URL_PARAM_KEY,
  ANALYTICS_VALID_PERIODS,
  coerceAnalyticsPeriod,
  isAnalyticsPeriod,
} from "@/features/social/analytics-period-invariants";

import type { AnalyticsPeriod } from "@/features/social/types/analytics";

/**
 * The shape returned by `usePeriodFilter`.
 */
export interface UsePeriodFilterResult {
  /** The current period (always a valid `AnalyticsPeriod` value). */
  period: AnalyticsPeriod;
  /**
   * `true` when the URL value is a documented `AnalyticsPeriod`,
   * `false` when the hook fell back to the default because the URL
   * was missing or unrecognised.
   */
  isValid: boolean;
  /** Set the period; updates the URL via `router.replace({ scroll: false })`. */
  setPeriod: (next: AnalyticsPeriod) => void;
  /**
   * Reset the period URL state. Removes `?period` from the URL;
   * called by the lifecycle-reset primitive on logout.
   */
  reset: () => void;
}

/**
 * Read a period from the URL params, falling back to the default
 * when the param is missing or unrecognised.
 *
 * Returns the parsed value and a boolean indicating whether the URL
 * value was a documented `AnalyticsPeriod` (i.e. did the hook have
 * to fall back).
 */
function readPeriodFromParams(params: URLSearchParams): {
  period: AnalyticsPeriod;
  isValid: boolean;
} {
  const raw = params.get(ANALYTICS_PERIOD_URL_PARAM_KEY);
  if (raw === null || raw === "") {
    return { period: ANALYTICS_DEFAULT_PERIOD, isValid: false };
  }
  if (isAnalyticsPeriod(raw)) {
    return { period: raw, isValid: true };
  }
  return { period: ANALYTICS_DEFAULT_PERIOD, isValid: false };
}

/**
 * URL-owned period state for the analytics surfaces.
 *
 * @returns `{ period, isValid, setPeriod, reset }` — see
 *          `UsePeriodFilterResult` for the contract.
 */
export function usePeriodFilter(): UsePeriodFilterResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { period, isValid } = useMemo(
    () => readPeriodFromParams(searchParams),
    [searchParams],
  );

  /**
   * Internal URL-mutation helper. Uses `router.replace(...)` with
   * `scroll: false` so the period change revalidates data but does
   * NOT scroll the viewport to the top (Story 6.3 Exit Criterion
   * #5: "Period change does not lose scroll position").
   */
  const writeParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      mutate(params);
      const query = params.toString();
      const next = query.length > 0 ? `${pathname}?${query}` : pathname;
      router.replace(next, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPeriod = useCallback(
    (next: AnalyticsPeriod) => {
      if (!ANALYTICS_VALID_PERIODS.includes(next)) {
        // Defensive: callers must pass a documented `AnalyticsPeriod`,
        // but a third-party bookmarklet or a future regression that
        // hands us an unknown value should not poison the URL.
        return;
      }
      writeParams((params) => {
        if (next === ANALYTICS_DEFAULT_PERIOD) {
          // Default value lives at the canonical URL (no `?period=week`).
          params.delete(ANALYTICS_PERIOD_URL_PARAM_KEY);
        } else {
          params.set(ANALYTICS_PERIOD_URL_PARAM_KEY, next);
        }
      });
    },
    [writeParams],
  );

  const reset = useCallback(() => {
    writeParams((params) => {
      params.delete(ANALYTICS_PERIOD_URL_PARAM_KEY);
    });
  }, [writeParams]);

  return { period, isValid, setPeriod, reset };
}

/**
 * Read-only access to the period URL key. Exposed for testing and
 * for future analytics surfaces that want to render the period as
 * text next to the chart.
 */
export const __testing = {
  ANALYTICS_PERIOD_URL_PARAM_KEY,
  ANALYTICS_DEFAULT_PERIOD,
  ANALYTICS_VALID_PERIODS,
  coerceAnalyticsPeriod,
  readPeriodFromParams,
};