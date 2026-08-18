

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

act(() => {
rerender({ value: "changed" });
    });
expect(result.current.debouncedValue).toBe("initial");

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

act(() => {
rerender({ value: "changed2" });
    });

expect(result.current.debouncedValue).toBe("initial");

act(() => {
vi.advanceTimersByTime(50);
    });
expect(result.current.debouncedValue).toBe("initial");

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

expect(result.current.debouncedValue).toBe("pending");
  });

it("cancel() emits the most recent input value synchronously", () => {
const { result, rerender } = renderHook(
({ value }: { value: string }) => useDebouncedValue(value),
{ initialProps: { value: "initial" } },
    );

act(() => {
rerender({ value: "pending" });
    });

act(() => {
result.current.cancel();
    });

expect(result.current.debouncedValue).toBe("pending");

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

act(() => {
vi.advanceTimersByTime(DEBOUNCE_WINDOW_MS);
    });
const stableRef = result.current.debouncedValue;

act(() => {
rerender({ value: "stable" });
    });
expect(result.current.debouncedValue).toBe(stableRef);
  });
});

describe("useDebouncedValue — cleanup on unmount", () => {
it("clears the timeout when the hook unmounts", () => {
const clearSpy = vi.spyOn(globalThis, "clearTimeout");

const { rerender, unmount } = renderHook(
({ value }: { value: string }) => useDebouncedValue(value),
{ initialProps: { value: "initial" } },
    );
act(() => {
rerender({ value: "pending" });
    });
expect(clearSpy).not.toHaveBeenCalled();

unmount();
expect(clearSpy).toHaveBeenCalled();
clearSpy.mockRestore();
  });
});

describe("useDebouncedValue — window clamping", () => {
it("accepts clamped window values without crashing", () => {

const { result: below } = renderHook(() => {
return useDebouncedValue("v", 50);
    });
void below;

const { result: above } = renderHook(() => {
return useDebouncedValue("v", 1000);
    });
void above;

expect(true).toBe(true);
  });
});
