

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "@/features/search/hooks/useDebouncedValue";

beforeEach(() => {
vi.useFakeTimers();
});

afterEach(() => {
vi.restoreAllMocks();
vi.useRealTimers();
});

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

rerender({ value: "third", delay: 250 });

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
await advanceTime(200);
expect(result.current.debouncedValue).toBe("a");

await advanceTime(110);
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

unmount();

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

rerender({ value: "same", delay: 250 });
await advanceTime(300);

expect(result.current.debouncedValue).toBe("same");
expect(result.current.debouncedValue).toBe(debouncedRef);
    });
  });
});
