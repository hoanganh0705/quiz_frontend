"use client";

import { useCallback, useEffect, useState } from "react";

import type { SearchHistoryEntry } from "@/features/search/types/search.types";
import { SEARCH_MIN_QUERY_LENGTH } from "@/features/search/hooks/useSearch";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { subscribeToAuthEvents } from "@/lib/api/core/broadcast-channel";

export const SEARCH_HISTORY_MAX_ENTRIES = 10;

export const SEARCH_HISTORY_STORAGE_KEY = "phase5:search:history:v1";

export interface UseSearchHistoryResult {

entries: readonly SearchHistoryEntry[];

push: (query: string) => void;

clear: () => void;

remove: (query: string) => void;
}

function readPersistedHistory(): SearchHistoryEntry[] {
if (typeof window === "undefined") return [];
let raw: string | null = null;
try {
raw = window.sessionStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
  } catch {
return [];
  }
if (!raw) return [];
try {
const parsed = JSON.parse(raw) as unknown;
if (!Array.isArray(parsed)) return [];

return parsed
      .filter(
(e): e is SearchHistoryEntry =>
typeof e === "object" &&
e !== null &&
typeof (e as { query?: unknown }).query === "string" &&
typeof (e as { timestamp?: unknown }).timestamp === "number",
      )
      .slice(0, SEARCH_HISTORY_MAX_ENTRIES);
  } catch {
return [];
  }
}

function writePersistedHistory(entries: readonly SearchHistoryEntry[]): void {
if (typeof window === "undefined") return;
try {
window.sessionStorage.setItem(
SEARCH_HISTORY_STORAGE_KEY,
JSON.stringify(entries),
    );
  } catch {
    // Storage unavailable — fall through silently.
  }
}

function clearPersistedHistory(): void {
if (typeof window === "undefined") return;
try {
window.sessionStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  } catch {
    // Storage unavailable — fall through silently.
  }
}

function normaliseForDedupe(query: string): string {
return query.trim().toLowerCase();
}

export function useSearchHistory(): UseSearchHistoryResult {
const flagValue = getFeatureFlagValue("search_live");
const isFlagPlaceholder = flagValue === "placeholder";

const [entries, setEntries] = useState<readonly SearchHistoryEntry[]>(() => {

return readPersistedHistory();
  });

useEffect(() => {
if (isFlagPlaceholder) return;
const unsubscribe = subscribeToAuthEvents((event) => {
if (
event.type === "LOGGED_OUT" ||
event.type === "ACCOUNT_DELETED" ||
event.type === "LOGGED_IN"
      ) {
setEntries([]);
clearPersistedHistory();
      }
    });
return () => {
unsubscribe();
    };
  }, [isFlagPlaceholder]);

const noop = useCallback(() => {
    /* no-op */
  }, []);

const push = useCallback(
(query: string) => {
if (isFlagPlaceholder) return;

const trimmed = query.trim();
if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {

return;
      }

setEntries((current) => {
const dedupeKey = normaliseForDedupe(trimmed);
const filtered = current.filter(
(entry) => normaliseForDedupe(entry.query) !== dedupeKey,
        );
const next: SearchHistoryEntry[] = [
{ query: trimmed, timestamp: Date.now() },
...filtered,
        ].slice(0, SEARCH_HISTORY_MAX_ENTRIES);
writePersistedHistory(next);
return next;
      });
    },
[isFlagPlaceholder],
  );

const clear = useCallback(() => {
if (isFlagPlaceholder) return;
setEntries([]);
clearPersistedHistory();
  }, [isFlagPlaceholder]);

const remove = useCallback(
(query: string) => {
if (isFlagPlaceholder) return;
const dedupeKey = normaliseForDedupe(query);
setEntries((current) => {
const next = current.filter(
(entry) => normaliseForDedupe(entry.query) !== dedupeKey,
        );
if (next.length === current.length) return current;
if (next.length === 0) {
clearPersistedHistory();
        } else {
writePersistedHistory(next);
        }
return next;
      });
    },
[isFlagPlaceholder],
  );

if (isFlagPlaceholder) {
return {
entries: [],
push: noop,
clear: noop,
remove: noop,
    };
  }

return { entries, push, clear, remove };
}