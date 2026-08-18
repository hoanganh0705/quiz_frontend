"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DEFAULT_SEARCH_DEBOUNCE_MS } from "@/features/search/hooks/useDebouncedValue";
import type { SearchResultKind } from "@/features/search/types/search.types";

export const URL_PARAM_QUERY = "q";

export const URL_PARAM_KINDS = "kinds";

export interface UseSearchUrlStateResult {

query: string;

kinds: readonly SearchResultKind[];

setQuery: (next: string) => void;

setKinds: (next: readonly SearchResultKind[]) => void;

reset: () => void;
}

const ALL_KINDS: readonly SearchResultKind[] = [
"quiz",
"user",
"tournament",
"achievement",
"ranking",
"tag",
"category",
"comment",
"social",
];

function parseKinds(raw: string | null): SearchResultKind[] {
if (!raw) return [];
const known = new Set<string>(ALL_KINDS);
return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && known.has(s)) as SearchResultKind[];
}

function serialiseKinds(kinds: readonly SearchResultKind[]): string | null {
if (kinds.length === 0) return null;

return [...kinds].sort().join(",");
}

export function useSearchUrlState(
options: { debounceMs?: number } = {},
): UseSearchUrlStateResult {
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

const debounceMs = options.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;

const [query, setQueryState] = useState<string>(() => {
return (searchParams.get(URL_PARAM_QUERY) ?? "").trim();
  });
const [kinds, setKindsState] = useState<readonly SearchResultKind[]>(() => {
return parseKinds(searchParams.get(URL_PARAM_KINDS));
  });

const lastWrittenQueryRef = useRef<string>(query);
const lastWrittenKindsRef = useRef<string>(
serialiseKinds(kinds) ?? "",
  );

useEffect(() => {
const urlQuery = (searchParams.get(URL_PARAM_QUERY) ?? "").trim();
const urlKinds = parseKinds(searchParams.get(URL_PARAM_KINDS));
const urlKindsString = serialiseKinds(urlKinds) ?? "";

if (urlQuery !== lastWrittenQueryRef.current) {
setQueryState(urlQuery);
lastWrittenQueryRef.current = urlQuery;
    }
if (urlKindsString !== lastWrittenKindsRef.current) {
setKindsState(urlKinds);
lastWrittenKindsRef.current = urlKindsString;
    }
  }, [searchParams]);

const writeUrl = useCallback(
(nextQuery: string, nextKinds: readonly SearchResultKind[]) => {
const params = new URLSearchParams();

const trimmedQuery = nextQuery.trim();
if (trimmedQuery.length > 0) {
params.set(URL_PARAM_QUERY, trimmedQuery);
      }
const kindsString = serialiseKinds(nextKinds);
if (kindsString !== null) {
params.set(URL_PARAM_KINDS, kindsString);
      }

const queryString = params.toString();
const target =
queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
router.replace(target);
    },
[router, pathname],
  );

const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const pendingQueryRef = useRef<string | null>(null);

const setQuery = useCallback(
(next: string) => {
const trimmed = next.trim();
setQueryState(trimmed);
pendingQueryRef.current = trimmed;
lastWrittenQueryRef.current = trimmed;

if (debounceTimerRef.current) {
clearTimeout(debounceTimerRef.current);
      }
debounceTimerRef.current = setTimeout(() => {
debounceTimerRef.current = null;
const pending = pendingQueryRef.current;
pendingQueryRef.current = null;
writeUrl(pending ?? trimmed, kinds);
      }, debounceMs);
    },
[writeUrl, kinds, debounceMs],
  );

useEffect(() => {
return () => {
if (debounceTimerRef.current) {
clearTimeout(debounceTimerRef.current);
debounceTimerRef.current = null;
const pending = pendingQueryRef.current;
pendingQueryRef.current = null;
if (pending !== null) {
writeUrl(pending, kinds);
        }
      }
    };
    // `writeUrl` and `kinds` are stable enough across the hook
    // lifecycle; we flush on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const setKinds = useCallback(
(next: readonly SearchResultKind[]) => {
setKindsState(next);
const kindsString = serialiseKinds(next) ?? "";
lastWrittenKindsRef.current = kindsString;

if (debounceTimerRef.current) {
clearTimeout(debounceTimerRef.current);
debounceTimerRef.current = null;
pendingQueryRef.current = null;
      }
writeUrl(query, next);
    },
[writeUrl, query],
  );

const reset = useCallback(() => {
setQueryState("");
setKindsState([]);
lastWrittenQueryRef.current = "";
lastWrittenKindsRef.current = "";
if (debounceTimerRef.current) {
clearTimeout(debounceTimerRef.current);
debounceTimerRef.current = null;
pendingQueryRef.current = null;
    }
router.replace(pathname);
  }, [router, pathname]);

return useMemo(
() => ({ query, kinds, setQuery, setKinds, reset }),
[query, kinds, setQuery, setKinds, reset],
  );
}