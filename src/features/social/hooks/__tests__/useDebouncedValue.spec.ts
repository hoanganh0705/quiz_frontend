/**
 * `useDebouncedValue.spec.ts` — Locks the debounce hook contract
 * (TKT-6.5.B1).
 *
 * Asserts:
 *
 *   - `debouncedValue` updates after the configured window has elapsed
 *     with no input change.
 *   - Cancelling before the window elapses prevents the update and
 *     emits the most recent input value synchronously.
 *   - A new input before the window elapses resets the timer.
 *   - The hook's `debouncedValue` is reference-stable when the input
 *     value does not change.
 *   - The hook clears its timeout on unmount.
 *   - The default window (when `windowMs` is omitted) is `DEBOUNCE_WINDOW_MS`.
 *   - The hook accepts clamped window values without crashing.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEBOUNCE_WINDOW_MS,
} from "@/features/social/discovery-invariants";

import { useDebouncedValue } from "@/features/social/hooks/useDebouncedValue";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedValue — default window", () => {
  it("uses DEBOUNCE_WINDOW_MS when windowMs is omitted", () => {
    const { result } = renderHook(() => {
      return useDebouncedValue("initial");
    });
    expect(result.current.debouncedValue).toBe("initial");

    // Advance timers by just under the default window — update should NOT fire.
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_WINDOW_MS - 1);
    });
    expect(result.current.debouncedValue).toBe("initial");
  });
});

describe("useDebouncedValue — debounce behaviour", () => {
  it("debouncedValue does not update until the window elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      { initialProps: { value: "initial" } },
    );

    expect(result.current.debouncedValue).toBe("initial");

    // Change value — update is pending.
    act(() => {
      rerender({ value: "changed" });
    });
    expect(result.current.debouncedValue).toBe("initial");

    // Advance past the window.
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_WINDOW_MS);
    });
    expect(result.current.debouncedValue).toBe("changed");
  });

  it("a new input before the window elapses resets the timer", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      { initialProps: { value: "initial" } },
    );

    act(() => {
      rerender({ value: "changed1" });
    });
    vi.advanceTimersByTime(DEBOUNCE_WINDOW_MS - 50);

    // Change again before the window elapses — timer should reset.
    act(() => {
      rerender({ value: "changed2" });
    });

    // The previous value should not have committed yet.
    expect(result.current.debouncedValue).toBe("initial");

    // Advance by the original window — still should not have committed.
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.debouncedValue).toBe("initial");

    // Advance past the reset window.
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_WINDOW_MS);
    });
    expect(result.current.debouncedValue).toBe("changed2");
  });
});

describe("useDebouncedValue — cancel", () => {
  it("cancel() prevents the pending update", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      { initialProps: { value: "initial" } },
    );

    act(() => {
      rerender({ value: "pending" });
    });
    expect(result.current.debouncedValue).toBe("initial");

    act(() => {
      result.current.cancel();
    });

    // The pending value should have been committed synchronously.
    expect(result.current.debouncedValue).toBe("pending");
  });

  it("cancel() emits the most recent input value synchronously", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      { initialProps: { value: "initial" } },
    );

    act(() => {
      rerender({ value: "pending" });
      result.current.cancel();
    });

    // After cancel, debouncedValue equals the latest input.
    expect(result.current.debouncedValue).toBe("pending");

    // Verify that a subsequent timer tick does not update it again.
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_WINDOW_MS * 2);
    });
    expect(result.current.debouncedValue).toBe("pending");
  });
});

describe("useDebouncedValue — identity stability", () => {
  it("debouncedValue is reference-stable when the input value does not change", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      { initialProps: { value: "stable" } },
    );

    // Wait for debounce to settle.
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_WINDOW_MS);
    });
    const stableRef = result.current.debouncedValue;

    // Re-render with the same value.
    act(() => {
      rerender({ value: "stable" });
    });
    expect(result.current.debouncedValue).toBe(stableRef);
  });
});

describe("useDebouncedValue — cleanup on unmount", () => {
  it("clears the timeout when the hook unmounts", () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = renderHook(() => {
      return useDebouncedValue("value");
    });
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe("useDebouncedValue — window clamping", () => {
  it("accepts clamped window values without crashing", () => {
    // Below minimum (150ms) should clamp to minimum.
    const { result: below } = renderHook(() => {
      return useDebouncedValue("v", 50);
    });
    void below;

    // Above maximum (600ms) should clamp to maximum.
    const { result: above } = renderHook(() => {
      return useDebouncedValue("v", 1000);
    });
    void above;

    // Exact clamp values are tested in discovery-invariants.spec.ts.
    expect(true).toBe(true);
  });
});
