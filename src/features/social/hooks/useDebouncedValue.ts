"use client";

/**
 * `useDebouncedValue` — Typed debounce hook with a configurable window
 * clamped to the documented boundaries and an explicit cancel handle.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.B1.
 *
 * ## What this hook owns
 *
 * The single debounce primitive for the entire social discovery surface.
 * The hook:
 *
 *   - Holds the configured debounce window (default: 300ms) for the entire
 *     discovery / search surface.
 *   - Returns `{ debouncedValue, cancel }`. `debouncedValue` is the
 *     last value that survived the full debounce window.
 *   - `cancel()` clears the pending timeout AND emits the most recent
 *     input value synchronously so a cancellation followed by an immediate
 *     re-render with a new value does not flash stale data.
 *   - On unmount the hook clears its timeout.
 *   - Honours `clampDebounceWindow` from `discovery-invariants.ts` so
 *     the window is always within the documented bounds.
 *
 * ## Why a hook (and not a utility function)
 *
 * `useDebouncedValue` holds `setTimeout` state that must be cleaned up
 * on unmount. A pure utility function without a lifecycle would leak
 * timers across renders and cause memory/performance issues. The hook
 * is the correct primitive for React's lifecycle model.
 *
 * ## React-hooks purity
 *
 * The hook captures `setTimeout` only inside `useEffect` (and inside the
 * `cancel` callback) — the render path is pure. The `debouncedValue`
 * is reference-stable when the input value does not change.
 *
 * ## Cleanup
 *
 * The timeout handle is stored in a `useRef` so the `useEffect` cleanup
 * callback can clear it deterministically. React 18 strict-mode
 * double-invocation is handled correctly because the cleanup callback
 * is the canonical unmount path.
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
