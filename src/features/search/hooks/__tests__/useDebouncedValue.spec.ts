/**
 * `useDebouncedValue.spec.ts` — locks the debounce primitive for the search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.G1.
 *
 * ## What this test locks
 *
 * - The canonical hook returns `{ debouncedValue, cancel }`. This
 *   test reads `result.current.debouncedValue` (the new contract
 *   introduced in Phase 8 / P1-16 consolidation).
 * - Timer cancellation: rapid value changes coalesce into a single update.
 * - Unmount cancellation: clearing the timer on component unmount.
 * - Referential identity: unchanged values return the same reference.
 * - Minimum delay: the debounced value appears no sooner than `delayMs`.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "@/features/search/hooks/useDebouncedValue";

// Use fake timers for deterministic timing tests.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Helper to advance time and flush React state updates. */
async function advanceTime(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useDebouncedValue", () => {
  describe("initialization", () => {
    it("returns the initial value immediately on first render", () => {
      const { result } = renderHook(() =>
        useDebouncedValue("hello", 250),
      );

      expect(result.current.debouncedValue).toBe("hello");
    });

    it("returns the initial value when value is undefined", () => {
      const { result } = renderHook(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useDebouncedValue(undefined as any, 250),
      );

      expect(result.current.debouncedValue).toBeUndefined();
    });
  });

  describe("debounce timing", () => {
    it("does not update before the delay has elapsed", async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: "initial", delay: 250 } },
      );

      expect(result.current.debouncedValue).toBe("initial");

      rerender({ value: "updated", delay: 250 });

      // Advance time by half the delay — value should NOT update yet.
      await advanceTime(124);
      expect(result.current.debouncedValue).toBe("initial");
    });

    it("returns the debounced value after the full delay", async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: "initial", delay: 250 } },
      );

      expect(result.current.debouncedValue).toBe("initial");

      rerender({ value: "updated", delay: 250 });

      // Advance past the full delay.
      await advanceTime(260);
      expect(result.current.debouncedValue).toBe("updated");
    });

    it("cancels the pending timer on a rapid change", async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: "first", delay: 250 } },
      );

      expect(result.current.debouncedValue).toBe("first");

      rerender({ value: "second", delay: 250 });
      await advanceTime(100);

      // Update to a third value before the second's timer fires.
      rerender({ value: "third", delay: 250 });

      // Advance past 250ms from the latest re-render.
      await advanceTime(260);
      expect(result.current.debouncedValue).toBe("third");
    });

    it("resets the timer on each value change", async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: "a", delay: 300 } },
      );

      expect(result.current.debouncedValue).toBe("a");

      rerender({ value: "b", delay: 300 });
      await advanceTime(200);

      rerender({ value: "c", delay: 300 });
      await advanceTime(200); // 200ms from last change
      expect(result.current.debouncedValue).toBe("a");

      await advanceTime(110); // 310ms from last change
      expect(result.current.debouncedValue).toBe("c");
    });
  });

  describe("unmount cancellation", () => {
    it("clears the pending timer on unmount", async () => {
      const { result, rerender, unmount } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: "initial", delay: 250 } },
      );

      rerender({ value: "pending", delay: 250 });
      await advanceTime(100);

      // Unmount before the timer fires.
      unmount();

      // No error should be thrown and the value should not have updated.
      await advanceTime(200);
      expect(result.current.debouncedValue).toBe("initial");
    });
  });

  describe("referential identity", () => {
    it("returns the same reference when the value has not changed", async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue(value, delay),
        { initialProps: { value: "same", delay: 250 } },
      );

      await advanceTime(300);
      const debouncedRef = result.current.debouncedValue;

      // Re-render with the same value.
      rerender({ value: "same", delay: 250 });
      await advanceTime(300);

      // The reference should be identical.
      expect(result.current.debouncedValue).toBe("same");
      expect(result.current.debouncedValue).toBe(debouncedRef);
    });
  });
});
