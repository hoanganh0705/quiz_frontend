

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

act(() => {
vi.advanceTimersByTime(0);
    });
const initialSeconds = result.current.remainingSeconds;

act(() => {
vi.advanceTimersByTime(1000);
    });
expect(result.current.remainingSeconds).toBe(initialSeconds - 1);

act(() => {
vi.advanceTimersByTime(4000);
    });
expect(result.current.remainingSeconds).toBe(0);
  });

it("remainingSeconds is clamped to 0", () => {
const { result } = renderHook(() => {
return useSearchRateLimit(1);
    });

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

act(() => {
vi.advanceTimersByTime(1500);
    });
result.current.onCooldownComplete(onComplete);

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

const { result, rerender } = renderHook(
({ cooldown }: { cooldown: number | null }) => useSearchRateLimit(cooldown),
{ initialProps: { cooldown: 2 } },
    );

result.current.onCooldownComplete(onComplete);
act(() => {
vi.advanceTimersByTime(3000);
    });
expect(onComplete).toHaveBeenCalledTimes(1);

onComplete.mockClear();

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

act(() => {
vi.advanceTimersByTime(5000);
    });
const afterFirstPartial = result.current.remainingSeconds;

act(() => {
rerender({ cooldown: 5 });
    });

expect(result.current.remainingSeconds).toBe(5);

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
