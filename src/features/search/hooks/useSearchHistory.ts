"use client";

/**
 * `useSearchHistory` — session-scoped search query history.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.B3.
 *
 * ## What this hook owns
 *
 * - Maintain a session-scoped list of recent search queries for the
 *   current user, capped at the documented maximum (`SEARCH_HISTORY_MAX_ENTRIES`).
 * - Persist the list to `sessionStorage` under
 *   `SEARCH_HISTORY_STORAGE_KEY` so the list survives page navigations
 *   inside the same tab but is cleared when the tab is closed.
 * - Dedupe identical queries (case-insensitive trimmed equality).
 * - Reject queries that are whitespace-only or below the documented
 *   minimum length (`SEARCH_MIN_QUERY_LENGTH`).
 * - Listen for cross-tab logout events (`LOGGED_OUT`,
 *   `ACCOUNT_DELETED`) and clear the session storage entry so the
 *   next user of this browser does not see the previous user's
 *   queries.
 *
 * ## Storage hygiene
 *
 * Entries are simple `{ query, timestamp }` records with **no**
 * identifiers and **no** unstable social IDs (`followId`,
 * `friendshipId`). The hook rejects any push that would carry
 * unstable identifiers and refuses to persist them.
 *
 * ## SSR
 *
 * The hook is SSR-safe. The initial state is read lazily on the
 * client only; the server renders an empty list.
 *
 * ## Feature flag
 *
 * When `search_live` is `'placeholder'`, the hook returns safe
 * no-ops so consumers can render without an explicit gate check.
 */

import { useCallback, useEffect, useState } from "react";

import type { SearchHistoryEntry } from "@/features/search/types/search.types";
import { SEARCH_MIN_QUERY_LENGTH } from "@/features/search/hooks/useSearch";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { subscribeToAuthEvents } from "@/lib/api/core/broadcast-channel";

// ─── Constants ────────────────────────────────────────────────────────────

/** Maximum number of history entries retained. */
export const SEARCH_HISTORY_MAX_ENTRIES = 10;

/** Storage key for the session-scoped search history. */
export const SEARCH_HISTORY_STORAGE_KEY = "phase5:search:history:v1";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Result shape returned by `useSearchHistory`.
 *
 * - `entries` — newest-first list of recent queries.
 * - `push(q)` — record a new query; dedupes, trims, and evicts FIFO
 *   beyond the cap. No-op when the feature flag is off.
 * - `clear()` — empty the list and remove the session-storage entry.
 * - `remove(query)` — remove a specific query from the list.
 */
export interface UseSearchHistoryResult {
  /** Newest-first list of recent queries. */
  entries: readonly SearchHistoryEntry[];
  /**
   * Record a new query. Trims whitespace, rejects queries below the
   * minimum length, and dedupes case-insensitively. The list is
   * capped at `SEARCH_HISTORY_MAX_ENTRIES`.
   */
  push: (query: string) => void;
  /** Empty the list and clear the session-storage entry. */
  clear: () => void;
  /** Remove a specific query from the list. No-op when absent. */
  remove: (query: string) => void;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────

/**
 * Read the persisted history from `sessionStorage`.
 *
 * Returns an empty array when storage is unavailable, when the entry
 * is missing, when the entry is malformed, or when running on the
 * server. SSR-safe.
 */
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
    // Validate each entry — silently drop anything malformed.
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

/**
 * Persist the history list to `sessionStorage`.
 *
 * Best-effort write: silently swallows quota / privacy-mode errors so
 * the search UI never breaks because storage is unavailable.
 */
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

/**
 * Clear the persisted history from `sessionStorage`.
 */
function clearPersistedHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  } catch {
    // Storage unavailable — fall through silently.
  }
}

/**
 * Normalise a query for dedupe comparison.
 *
 * Trims whitespace and lowercases the result so two queries that
 * differ only in case / surrounding whitespace compare equal.
 */
function normaliseForDedupe(query: string): string {
  return query.trim().toLowerCase();
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Session-scoped search query history with cap, dedupe, and logout
 * clearing. Backed by `sessionStorage` so the list survives page
 * navigations inside the same tab and is cleared on tab close.
 */
export function useSearchHistory(): UseSearchHistoryResult {
  const flagValue = getFeatureFlagValue("search_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [entries, setEntries] = useState<readonly SearchHistoryEntry[]>(() => {
    // Lazy hydration from sessionStorage. Returns an empty list on
    // the server (typeof window === 'undefined') and when storage
    // is unavailable.
    return readPersistedHistory();
  });

  // Listen for cross-tab logout events and clear the list.
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

  // Stable no-op callbacks when the flag is off.
  const noop = useCallback(() => {
    /* no-op */
  }, []);

  const push = useCallback(
    (query: string) => {
      if (isFlagPlaceholder) return;

      const trimmed = query.trim();
      if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
        // Reject queries below the documented minimum length.
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