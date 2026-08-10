"use client";

/**
 * `useSearchUrlState` — synchronise the search query and result-kind
 * selection with the URL.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.B4.
 *
 * ## What this hook owns
 *
 * - Read `q` and `kinds` from the URL on mount (with safe defaults).
 * - Expose `query`, `kinds`, `setQuery`, `setKinds`, and `reset`.
 * - Debounce the `setQuery` URL write by the configured delay (default
 *   `DEFAULT_SEARCH_DEBOUNCE_MS`) so a burst of input changes does
 *   not thrash the browser history.
 * - Write `setKinds` updates immediately (no debounce).
 * - Rehydrate from URL changes triggered by other sources (back /
 *   forward navigation, deep-link visit, etc.).
 * - `reset()` clears the URL search params entirely.
 *
 * ## Unstable social IDs
 *
 * The hook **never** writes `followId`, `friendshipId`, or any other
 * unstable identifier to the URL. Only `q` and `kinds` are persisted;
 * both are stable public values per the Story 5.6 acceptance
 * criteria #3 ("Search result navigation does not persist unstable
 * social IDs in URLs").
 *
 * ## SSR
 *
 * The hook reads `useSearchParams()` on mount; components that call
 * this hook must be wrapped in `<Suspense>` per the Next.js App
 * Router requirement for client components that read search params on
 * a server-prerendered route (mirrors the `RankingsPage` and
 * `BadgeGallery` precedent).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DEFAULT_SEARCH_DEBOUNCE_MS } from "@/features/search/hooks/useDebouncedValue";
import type { SearchResultKind } from "@/features/search/types/search.types";

// ─── Constants ────────────────────────────────────────────────────────────

/** URL parameter name for the trimmed query string. */
export const URL_PARAM_QUERY = "q";

/** URL parameter name for the comma-separated selected kinds. */
export const URL_PARAM_KINDS = "kinds";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Result shape returned by `useSearchUrlState`.
 *
 * - `query`         — current URL-driven query string (trimmed).
 * - `kinds`         — current URL-driven selected kinds (parsed).
 * - `setQuery(q)`   — write the trimmed query to the URL (debounced).
 * - `setKinds(k)`   — write the kinds selection to the URL immediately.
 * - `reset()`       — clear the URL params (no `q`, no `kinds`).
 */
export interface UseSearchUrlStateResult {
  /** Current trimmed query string from the URL. */
  query: string;
  /** Current selected kinds from the URL. */
  kinds: readonly SearchResultKind[];
  /** Write the trimmed query to the URL (debounced). */
  setQuery: (next: string) => void;
  /** Write the kinds selection to the URL immediately. */
  setKinds: (next: readonly SearchResultKind[]) => void;
  /** Clear the URL params. */
  reset: () => void;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────

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

/**
 * Parse the `kinds` URL param into a `SearchResultKind[]`.
 *
 * Accepts a comma-separated list of kind values. Unknown values are
 * silently dropped (defensive — the URL may have stale entries from
 * an older release).
 */
function parseKinds(raw: string | null): SearchResultKind[] {
  if (!raw) return [];
  const known = new Set<string>(ALL_KINDS);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && known.has(s)) as SearchResultKind[];
}

/**
 * Serialise the kinds selection into a URL-safe string.
 *
 * Returns `null` when the selection is empty (no URL param).
 */
function serialiseKinds(kinds: readonly SearchResultKind[]): string | null {
  if (kinds.length === 0) return null;
  // Sort for stable URLs (independent of input order).
  return [...kinds].sort().join(",");
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * URL-state synchronisation for the search surface.
 *
 * Writes are debounced for the query (so input bursts do not thrash
 * history) and immediate for kinds (so filter chips update without
 * delay). Reads rehydrate from URL changes triggered by other
 * sources.
 */
export function useSearchUrlState(
  options: { debounceMs?: number } = {},
): UseSearchUrlStateResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const debounceMs = options.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;

  // ── Initial state from URL (seed once) ────────────────────────────────
  const [query, setQueryState] = useState<string>(() => {
    return (searchParams.get(URL_PARAM_QUERY) ?? "").trim();
  });
  const [kinds, setKindsState] = useState<readonly SearchResultKind[]>(() => {
    return parseKinds(searchParams.get(URL_PARAM_KINDS));
  });

  // Track the last URL we wrote so we don't trigger a re-render loop
  // when we ourselves initiated the change.
  const lastWrittenQueryRef = useRef<string>(query);
  const lastWrittenKindsRef = useRef<string>(
    serialiseKinds(kinds) ?? "",
  );

  // ── Rehydrate from URL changes (back/forward, deep-link, etc.) ────────
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

  // ── URL writers ────────────────────────────────────────────────────────
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

  // ── Debounced query writer ────────────────────────────────────────────
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

  // Flush the debounce on unmount so the latest value reaches the URL.
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
      // Cancel any pending debounced query write — we want the kinds
      // change to land immediately.
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