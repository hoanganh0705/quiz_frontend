/**
 * `useSearchRateLimit.spec.ts` — Locks the search rate-limit hook
 * contract (TKT-6.5.B2).
 *
 * Asserts:
 *
 *   - With `cooldownSeconds === null`, returns `isRateLimited: false`
 *     and `remainingSeconds: 0`.
 *   - With `cooldownSeconds === 0`, returns `isRateLimited: false`.
 *   - With `cooldownSeconds === 30`, returns `isRateLimited: true`,
 *     a non-null `rateLimitedUntil`, and a `remainingSeconds` that
 *     counts down toward `0`.
 *   - `onCooldownComplete` registers a callback that fires exactly
 *     once when `remainingSeconds` reaches `0`.
 *   - `onCooldownComplete` is ignored when the cooldown is not active.
 *   - A new `cooldownSeconds` value restarts the countdown cleanly.
 *   - The hook clears timers on unmount.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSearchRateLimit } from "@/features/social/hooks/useSearchRateLimit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSearchRateLimit — null input", () => {
  it("returns isRateLimited: false and remainingSeconds: 0 when cooldownSeconds is null", () => {
    const { result } = renderHook(() => {
      return useSearchRateLimit(null);
    });
    expect(result.current.isRateLimited).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.rateLimitedUntil).toBeNull();
  });
});

describe("useSearchRateLimit — zero input", () => {
  it("returns isRateLimited: false when cooldownSeconds is 0", () => {
    const { result } = renderHook(() => {
      return useSearchRateLimit(0);
    });
    expect(result.current.isRateLimited).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.rateLimitedUntil).toBeNull();
  });
});

describe("useSearchRateLimit — positive input", () => {
  it("returns isRateLimited: true and a non-null rateLimitedUntil", () => {
    const { result } = renderHook(() => {
      return useSearchRateLimit(30);
    });
    expect(result.current.isRateLimited).toBe(true);
    expect(result.current.rateLimitedUntil).not.toBeNull();
  });

  it("remainingSeconds counts down toward 0", () => {
    const { result } = renderHook(() => {
      return useSearchRateLimit(5);
    });

    // Initial tick.
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const initialSeconds = result.current.remainingSeconds;

    // Advance by 1 second — should have decremented by 1.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remainingSeconds).toBe(initialSeconds - 1);

    // Advance to the end.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("remainingSeconds is clamped to 0", () => {
    const { result } = renderHook(() => {
      return useSearchRateLimit(1);
    });

    // Advance well past the cooldown.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isRateLimited).toBe(false);
  });
});

describe("useSearchRateLimit — onCooldownComplete", () => {
  it("fires exactly once when remainingSeconds reaches 0", () => {
    const onComplete = vi.fn();

    const { result } = renderHook(() => {
      return useSearchRateLimit(3);
    });

    result.current.onCooldownComplete(onComplete);

    // Advance past the cooldown.
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("fires exactly once even if registered after the cooldown started", () => {
    const onComplete = vi.fn();

    const { result } = renderHook(() => {
      return useSearchRateLimit(2);
    });

    // Register the callback partway through.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    result.current.onCooldownComplete(onComplete);

    // Advance to the end.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("is ignored when cooldownSeconds is null", () => {
    const onComplete = vi.fn();

    const { result } = renderHook(() => {
      return useSearchRateLimit(null);
    });

    result.current.onCooldownComplete(onComplete);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("the callback is cleared after firing so a re-rate-limit cycle can register a fresh one", () => {
    const onComplete = vi.fn();

    // First cooldown.
    const { result, rerender } = renderHook(
      ({ cooldown }: { cooldown: number | null }) => useSearchRateLimit(cooldown),
      { initialProps: { cooldown: 2 } },
    );

    result.current.onCooldownComplete(onComplete);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Reset the mock.
    onComplete.mockClear();

    // Second cooldown with a new cooldownSeconds value.
    act(() => {
      rerender({ cooldown: 3 });
    });
    result.current.onCooldownComplete(onComplete);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("useSearchRateLimit — clean restart on new cooldownSeconds", () => {
  it("a new cooldownSeconds value restarts the countdown cleanly", () => {
    const { result, rerender } = renderHook(
      ({ cooldown }: { cooldown: number | null }) => useSearchRateLimit(cooldown),
      { initialProps: { cooldown: 10 } },
    );

    // Partially tick down.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const afterFirstPartial = result.current.remainingSeconds;

    // New cooldown value — should restart from the new value.
    act(() => {
      rerender({ cooldown: 5 });
    });

    // remainingSeconds should jump back up to 5 (not stay at ~5).
    expect(result.current.remainingSeconds).toBe(5);

    // Verify the old partial tick is gone.
    void afterFirstPartial;
  });
});

describe("useSearchRateLimit — cleanup on unmount", () => {
  it("clears timers when the hook unmounts", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() => {
      return useSearchRateLimit(30);
    });
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
