/**
 * `useDebouncedValue<T>(value, delay)` — typed debounce hook with a
 * configurable window clamped to the documented bounds and an
 * explicit cancel handle.
 *
 * Source epic:   Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.E1 (core) + TKT-6.5.B1 (typed + cancel).
 *
 * ## P1-16 consolidation
 *
 * The Phase 8 audit (P1-16) consolidates the two prior
 * `useDebouncedValue` implementations into one canonical hook:
 *
 *   - The original Phase 3 implementation
 *     (`@/lib/utils/use-debounced-value`) — a minimal `useState`
 *     + `useEffect` + `setTimeout` with no `cancel` handle.
 *   - The Phase 6 social discovery implementation
 *     (`@/features/social/hooks/useDebouncedValue`) — a richer
 *     hook with `cancel()`, reference-stability preservation, and
 *     discovery-invariant window clamping.
 *
 * The Phase 6 hook is the canonical implementation because it
 * supersedes the Phase 3 hook's API (the `cancel()` handle is
 * required by `useSearchRateLimit` — TKT-6.5.B3) without
 * sacrificing the Phase 3 hook's minimalism. The canonical
 * `(value, windowMs?) => { debouncedValue, cancel }` contract is
 * back-compatible with the Phase 3 `(value, delay) => T` form
 * through a property accessor on the returned object.
 *
 * ## What this hook owns
 *
 * - Holds the configured debounce window (default: 300ms) for the
 *   entire discovery / search surface.
 * - Returns `{ debouncedValue, cancel }`. `debouncedValue` is the
 *   last value that survived the full debounce window.
 * - `cancel()` clears the pending timeout AND emits the most recent
 *   input value synchronously so a cancellation followed by an
 *   immediate re-render with a new value does not flash stale data.
 * - On unmount the hook clears its timeout.
 * - Honours `clampDebounceWindow` from `discovery-invariants.ts` so
 *   the window is always within the documented bounds.
 *
 * ## SSR
 *
 * The hook is a no-op on the server (the first render returns the
 * initial value). The `setTimeout`-based update is client-only.
 *
 * @see discovery-invariants.ts — `DEBOUNCE_WINDOW_MS`,
 *      `clampDebounceWindow`.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  clampDebounceWindow,
  DEBOUNCE_WINDOW_MS,
} from "@/features/social/discovery-invariants";

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * Result of `useDebouncedValue`.
 *
 * @template T — The type of the value being debounced.
 */
export interface UseDebouncedValueResult<T> {
  /** The value that has survived the full debounce window. */
  readonly debouncedValue: T;
  /**
   * Cancel any pending update. Clears the timeout AND synchronously
   * emits the most recent input value so a cancelled state does not
   * flash stale data.
   */
  readonly cancel: () => void;
}

/**
 * Typed debounce hook with an explicit cancel handle.
 *
 * @template T — The type of the value being debounced.
 * @param value — The value to debounce.
 * @param windowMs — Optional debounce window in milliseconds. When
 *                  omitted, uses `DEBOUNCE_WINDOW_MS` (300ms). When
 *                  provided, the value is clamped to
 *                  `[DEBOUNCE_WINDOW_MIN_MS, DEBOUNCE_WINDOW_MAX_MS]`
 *                  via `clampDebounceWindow`.
 * @returns `{ debouncedValue, cancel }`.
 */
export function useDebouncedValue<T>(
  value: T,
  windowMs?: number,
): UseDebouncedValueResult<T> {
  const window = clampDebounceWindow(windowMs ?? DEBOUNCE_WINDOW_MS);

  // The most recently committed (debounced) value. Initialized to the
  // input so the first render is not empty.
  const [debouncedValue, setDebouncedValue] = useState<T>(() => value);

  // Stable ref to the latest value so the timer callback always reads
  // the current input, not a stale closure value.
  const latestValueRef = useRef<T>(value);

  // The pending timeout handle. Stored in a ref so the cleanup callback
  // can clear it deterministically.
  const timeoutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the stable ref with the latest value on every render.
  latestValueRef.current = value;

  useEffect(() => {
    // Clear any existing pending timer so rapid value changes reset the
    // window (standard debounce behaviour).
    if (timeoutHandleRef.current !== null) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }

    // If the value hasn't changed since the last debounce, do nothing.
    // This preserves identity stability for unchanged references.
    if (Object.is(value, debouncedValue)) {
      return;
    }

    timeoutHandleRef.current = setTimeout(() => {
      // Timer fired: commit the latest value.
      setDebouncedValue(latestValueRef.current);
      timeoutHandleRef.current = null;
    }, window);

    return () => {
      if (timeoutHandleRef.current !== null) {
        clearTimeout(timeoutHandleRef.current);
        timeoutHandleRef.current = null;
      }
    };
  }, [value, window, debouncedValue]);

  /**
   * Cancel any pending update. Clears the timeout and synchronously
   * emits the most recent input value so the caller does not flash
   * stale data after a cancellation.
   */
  const cancel = useCallback(() => {
    if (timeoutHandleRef.current !== null) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }
    // Emit the most recent input value synchronously so the caller
    // does not flash stale data after cancelling.
    setDebouncedValue(latestValueRef.current);
  }, []);

  return { debouncedValue, cancel };
}

/**
 * Convenience helper: returns the debounced value directly. For
 * callers that do not need a `cancel()` handle (e.g. simple
 * `useEffect`-dependent fetches).
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedValueOnly(searchTerm, 250);
 * useEffect(() => { fetch(debouncedSearch); }, [debouncedSearch]);
 * ```
 */
export function useDebouncedValueOnly<T>(value: T, windowMs?: number): T {
  return useDebouncedValue(value, windowMs).debouncedValue;
}