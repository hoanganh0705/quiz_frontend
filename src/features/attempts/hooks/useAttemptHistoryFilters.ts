"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
DEFAULT_ATTEMPT_HISTORY_FILTERS,
type AttemptHistoryDateRange,
type AttemptHistoryFilters,
type AttemptHistoryStatusFilter,
} from "@/features/attempts/types/attempt-history.types";

const PARAM_STATUS = "status";
const PARAM_DATE = "date";
const PARAM_SEARCH = "q";
const PARAM_CURSOR = "cursor";

function parseStatusFilter(raw: string | null): AttemptHistoryStatusFilter {
switch (raw) {
case "completed":
case "abandoned":
case "started":
case "all":
return raw;
default:
return DEFAULT_ATTEMPT_HISTORY_FILTERS.status;
  }
}

function parseDateFilter(raw: string | null): AttemptHistoryDateRange {
switch (raw) {
case "last_7_days":
case "last_30_days":
case "last_90_days":
case "all":
return raw;
default:
return DEFAULT_ATTEMPT_HISTORY_FILTERS.dateRange;
  }
}

function parseSearchFilter(raw: string | null): string {
if (raw === null) return "";
return raw;
}

function parseCursorFilter(raw: string | null): string | null {
if (raw === null || raw.length === 0) return null;
return raw;
}

export function serializeAttemptHistoryFiltersToParams(
filters: AttemptHistoryFilters,
): URLSearchParams {
const params = new URLSearchParams();
if (filters.status !== DEFAULT_ATTEMPT_HISTORY_FILTERS.status) {
params.set(PARAM_STATUS, filters.status);
  }
if (filters.dateRange !== DEFAULT_ATTEMPT_HISTORY_FILTERS.dateRange) {
params.set(PARAM_DATE, filters.dateRange);
  }
if (filters.search.trim().length > 0) {
params.set(PARAM_SEARCH, filters.search.trim());
  }
if (filters.cursor !== null) {
params.set(PARAM_CURSOR, filters.cursor);
  }
return params;
}

export interface UseAttemptHistoryFiltersResult {
filters: AttemptHistoryFilters;

setFilter: <K extends keyof AttemptHistoryFilters>(
key: K,
value: AttemptHistoryFilters[K],
  ) => void;

resetFilters: () => void;
}

export function useAttemptHistoryFilters(): UseAttemptHistoryFiltersResult {
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

const seededRef = useRef(false);
const [filters, setFilters] = useState<AttemptHistoryFilters>(() => {
const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
const dateRange = parseDateFilter(searchParams.get(PARAM_DATE));
const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
return {
status,
dateRange,
search,
cursor,
limit: DEFAULT_ATTEMPT_HISTORY_FILTERS.limit,
    };
  });

useEffect(() => {
if (seededRef.current) return;
seededRef.current = true;

const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
const dateRange = parseDateFilter(searchParams.get(PARAM_DATE));
const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
setFilters({
status,
dateRange,
search,
cursor,
limit: DEFAULT_ATTEMPT_HISTORY_FILTERS.limit,
    });
  }, [searchParams]);

const writeFiltersToUrl = useCallback(
(next: AttemptHistoryFilters): void => {
const params = serializeAttemptHistoryFiltersToParams(next);
const queryString = params.toString();
const target =
queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
router.replace(target);
    },
[router, pathname],
  );

const setFilter = useCallback(
<K extends keyof AttemptHistoryFilters>(
key: K,
value: AttemptHistoryFilters[K],
    ): void => {
setFilters((prev) => {
const next: AttemptHistoryFilters = {
...prev,
[key]: value,
        };

if (key === "status" || key === "dateRange" || key === "search") {
next.cursor = null;
        }
writeFiltersToUrl(next);
return next;
      });
    },
[writeFiltersToUrl],
  );

const resetFilters = useCallback((): void => {
const next: AttemptHistoryFilters = {
...DEFAULT_ATTEMPT_HISTORY_FILTERS,

limit: filters.limit,
    };
setFilters(next);
writeFiltersToUrl(next);
  }, [filters.limit, writeFiltersToUrl]);

return {
filters,
setFilter,
resetFilters,
  };
}