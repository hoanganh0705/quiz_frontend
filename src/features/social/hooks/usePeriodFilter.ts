"use client";

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

export interface UsePeriodFilterResult {

period: AnalyticsPeriod;

isValid: boolean;

setPeriod: (next: AnalyticsPeriod) => void;

reset: () => void;
}

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

export function usePeriodFilter(): UsePeriodFilterResult {
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

const { period, isValid } = useMemo(
() => readPeriodFromParams(searchParams),
[searchParams],
  );

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

return;
      }
writeParams((params) => {
if (next === ANALYTICS_DEFAULT_PERIOD) {

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

export const __testing = {
ANALYTICS_PERIOD_URL_PARAM_KEY,
ANALYTICS_DEFAULT_PERIOD,
ANALYTICS_VALID_PERIODS,
coerceAnalyticsPeriod,
readPeriodFromParams,
};