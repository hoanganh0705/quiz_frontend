"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
DEFAULT_TOURNAMENT_LIST_FILTERS,
type TournamentListFilters,
type TournamentStatus,
} from "@/features/tournaments/types/tournament.types";

const PARAM_STATUS = "status";
const PARAM_SEARCH = "q";
const PARAM_CURSOR = "cursor";

function parseStatusFilter(raw: string | null): TournamentStatus | undefined {
switch (raw) {
case "upcoming":
case "registration":
case "ongoing":
case "finished":
case "cancelled":
return raw;
default:
return undefined;
  }
}

function parseSearchFilter(raw: string | null): string {
if (raw === null) return "";
return raw;
}

function parseCursorFilter(raw: string | null): string | undefined {
if (raw === null || raw.length === 0) return undefined;
return raw;
}

function serializeToParams(filters: TournamentListFilters): URLSearchParams {
const params = new URLSearchParams();

if (filters.status !== undefined) {
params.set(PARAM_STATUS, filters.status);
  }
if (filters.search.trim().length > 0) {
params.set(PARAM_SEARCH, filters.search.trim());
  }
if (filters.cursor !== undefined) {
params.set(PARAM_CURSOR, filters.cursor);
  }

return params;
}

export interface UseTournamentFiltersResult {
filters: TournamentListFilters;

setFilter: <K extends keyof TournamentListFilters>(
key: K,
value: TournamentListFilters[K],
  ) => void;

resetFilters: () => void;

setCursor: (cursor: string | undefined) => void;

clearCursor: () => void;
}

export function useTournamentFilters(): UseTournamentFiltersResult {
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

const seededRef = useRef(false);

const [filters, setFilters] = useState<TournamentListFilters>(() => {
const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
return {
status,
search,
cursor,
limit: DEFAULT_TOURNAMENT_LIST_FILTERS.limit,
    };
  });

useEffect(() => {
if (!seededRef.current) {
seededRef.current = true;
    }

const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
setFilters((prev) => {
if (
prev.status === status &&
prev.search === search &&
prev.cursor === cursor
      ) {
return prev;
      }
return {
status,
search,
cursor,
limit: DEFAULT_TOURNAMENT_LIST_FILTERS.limit,
      };
    });
  }, [searchParams]);

const writeFiltersToUrl = useCallback(
(next: TournamentListFilters): void => {
const params = serializeToParams(next);
const queryString = params.toString();
const target =
queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
router.replace(target);
    },
[router, pathname],
  );

const setFilter = useCallback(
<K extends keyof TournamentListFilters>(
key: K,
value: TournamentListFilters[K],
    ): void => {
setFilters((prev) => {
const next: TournamentListFilters = {
...prev,
[key]: value,
        };

if (key === "status" || key === "search") {
next.cursor = undefined;
        }
return next;
      });
    },
[],
  );

const resetFilters = useCallback((): void => {
setFilters({
...DEFAULT_TOURNAMENT_LIST_FILTERS,
    });
  }, []);

const setCursor = useCallback((cursor: string | undefined): void => {
setFilters((prev) => ({ ...prev, cursor }));
  }, []);

const clearCursor = useCallback((): void => {
setFilters((prev) => ({ ...prev, cursor: undefined }));
  }, []);

useEffect(() => {
if (seededRef.current === false) return;
writeFiltersToUrl(filters);
    // We intentionally depend on `filters` only — `writeFiltersToUrl`
    // closes over the latest `router` / `pathname` and is stable
    // across renders for a given route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

return {
filters,
setFilter,
resetFilters,
setCursor,
clearCursor,
  };
}
