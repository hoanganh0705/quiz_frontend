"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_ATTEMPT_HISTORY_FILTERS,
  serializeAttemptHistoryFilters,
} from "@/features/attempts/types/attempt-history.types";

import type {
  AttemptHistoryDateRange,
  AttemptHistoryFilters,
  AttemptHistoryStatusFilter,
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

function readFiltersFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
  limit: number | undefined = DEFAULT_ATTEMPT_HISTORY_FILTERS.limit,
): AttemptHistoryFilters {
  return {
    status: parseStatusFilter(searchParams.get(PARAM_STATUS)),
    dateRange: parseDateFilter(searchParams.get(PARAM_DATE)),
    search: parseSearchFilter(searchParams.get(PARAM_SEARCH)),
    cursor: parseCursorFilter(searchParams.get(PARAM_CURSOR)),
    limit,
  };
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

  const [filters, setFilters] = useState<AttemptHistoryFilters>(() =>
    readFiltersFromSearchParams(searchParams),
  );
  const filtersRef = useRef<AttemptHistoryFilters>(filters);
  const lastSearchParamsRef = useRef<string>(searchParams.toString());

  // Re-sync only when external navigation (back/forward) actually changes the URL.
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    if (searchParamsString === lastSearchParamsRef.current) return;
    lastSearchParamsRef.current = searchParamsString;

    const fromUrl = readFiltersFromSearchParams(
      searchParams,
      filtersRef.current.limit,
    );
    if (
      serializeAttemptHistoryFilters(fromUrl) !==
      serializeAttemptHistoryFilters(filtersRef.current)
    ) {
      filtersRef.current = fromUrl;
      setFilters(fromUrl);
    }
  }, [searchParams, searchParamsString]);

  const writeFiltersToUrl = useCallback(
    (next: AttemptHistoryFilters): void => {
      const params = serializeAttemptHistoryFiltersToParams(next);
      const queryString = params.toString();
      lastSearchParamsRef.current = queryString;
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
      const prev = filtersRef.current;
      const next: AttemptHistoryFilters = {
        ...prev,
        [key]: value,
      };

      if (key === "status" || key === "dateRange" || key === "search") {
        next.cursor = null;
      }

      filtersRef.current = next;
      setFilters(next);
      writeFiltersToUrl(next);
    },
    [writeFiltersToUrl],
  );

  const resetFilters = useCallback((): void => {
    const next: AttemptHistoryFilters = {
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      limit: filtersRef.current.limit,
    };
    filtersRef.current = next;
    setFilters(next);
    writeFiltersToUrl(next);
  }, [writeFiltersToUrl]);

  return {
    filters,
    setFilter,
    resetFilters,
  };
}
