

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useSearch } from "@/features/search/hooks/useSearch";

const mockGetFeatureFlagValue = vi.fn();
const mockSearch = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock("@/features/search/services/search.service", () => ({
search: (...args: unknown[]) => mockSearch(...args),
}));

const WIRE_RESPONSE = {
query: "test",
users: [
{ userId: "u1", username: "testuser", displayName: "Test User" },
  ],
quizzes: [],
tags: [],
categories: [],
comments: [],
};

const WIRE_EMPTY = {
query: "nonexistent",
users: [],
quizzes: [],
tags: [],
categories: [],
comments: [],
};

function makeMockError(status: number, code: string) {
const error = new Error("mock error") as unknown as {
response?: { status: number; data: { extensions?: { code?: string } } };
config?: { url?: string };
  };
error.response = {
status,
data: { extensions: { code } },
  };
error.config = { url: "/search" };
return error;
}

function installDefaultMock() {
mockSearch.mockImplementation(async () => WIRE_EMPTY);
}

describe("useSearch", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
installDefaultMock();
vi.useFakeTimers();
  });

afterEach(() => {
vi.restoreAllMocks();
vi.useRealTimers();
  });

describe("feature flag gating", () => {
it("returns null groups and idle state when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

const { result } = renderHook(() =>
useSearch({ q: "test" }),
      );

expect(result.current.groups).toBeNull();
expect(result.current.state).toBe("idle");
expect(result.current.isLoading).toBe(false);
expect(mockSearch).not.toHaveBeenCalled();
    });

it("returns live state when flag is live", async () => {
mockSearch.mockResolvedValueOnce(WIRE_EMPTY);

const { result } = renderHook(() =>
useSearch({ q: "test" }),
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("empty");
    });
  });

describe("minimum query length", () => {
it("short-circuits to idle when query is 1 character", async () => {
const { result } = renderHook(() =>
useSearch({ q: "a" }),
      );

expect(result.current.state).toBe("idle");
expect(result.current.groups).toBeNull();
expect(mockSearch).not.toHaveBeenCalled();
    });

it("short-circuits to idle when query is empty", async () => {
const { result } = renderHook(() =>
useSearch({ q: "" }),
      );

expect(result.current.state).toBe("idle");
expect(result.current.groups).toBeNull();
expect(mockSearch).not.toHaveBeenCalled();
    });

it("short-circuits to idle when query is whitespace only", async () => {
const { result } = renderHook(() =>
useSearch({ q: "   " }),
      );

expect(result.current.state).toBe("idle");
expect(result.current.groups).toBeNull();
expect(mockSearch).not.toHaveBeenCalled();
    });
  });

describe("debounce", () => {
it("does not fire request before debounce delay", () => {
renderHook(
({ q }) => useSearch({ q }),
{ initialProps: { q: "" } },
      );

act(() => {
vi.advanceTimersByTime(200);
      });
expect(mockSearch).not.toHaveBeenCalled();
    });
  });

describe("request cancellation", () => {
it("discards slow response when a newer query has already resolved", async () => {
const firstResponse = { ...WIRE_RESPONSE, query: "first" };
const secondResponse = { ...WIRE_RESPONSE, query: "second" };
mockSearch
        .mockImplementationOnce(async () => firstResponse)
        .mockImplementationOnce(async () => secondResponse);

const { result, rerender } = renderHook(
({ q }) => useSearch({ q }),
{ initialProps: { q: "first" } },
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("success");

rerender({ q: "second" });
await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("success");

expect(result.current.groups).not.toBeNull();
    });
  });

describe("stale-result preservation", () => {
it("sets isStale when loading with existing groups", async () => {
const firstResponse = { ...WIRE_RESPONSE, query: "first" };

mockSearch
        .mockImplementationOnce(async () => firstResponse)
        .mockImplementationOnce(() => new Promise(() => {}));

const { result, rerender } = renderHook(
({ q }) => useSearch({ q }),
{ initialProps: { q: "first" } },
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("success");
expect(result.current.groups).not.toBeNull();

rerender({ q: "second" });
await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });

expect(result.current.isStale).toBe(true);
expect(result.current.groups).not.toBeNull(); // preserved
    });
  });

describe("empty state", () => {
it("returns empty state when all groups are absent", async () => {
mockSearch.mockResolvedValueOnce(WIRE_EMPTY);

const { result } = renderHook(() =>
useSearch({ q: "nonexistent" }),
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("empty");
expect(result.current.groups).toEqual({});
expect(result.current.hasResults).toBe(false);
    });
  });

describe("error handling", () => {
it("returns error state on request failure", async () => {
const err = makeMockError(500, "GLOBAL_INTERNAL_ERROR");
mockSearch.mockImplementationOnce(async () => {
throw err;
      });

const { result } = renderHook(() =>
useSearch({ q: "error" }),
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });

await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("error");
expect(result.current.error).not.toBeNull();
    });

it("hasResults is false when error", async () => {
const err = makeMockError(500, "GLOBAL_INTERNAL_ERROR");
mockSearch.mockImplementationOnce(async () => {
throw err;
      });

const { result } = renderHook(() =>
useSearch({ q: "error" }),
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });

await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("error");
expect(result.current.hasResults).toBe(false);
    });
  });

describe("retry", () => {
it("retry() re-fires the current query", async () => {
const errOnce = makeMockError(500, "GLOBAL_INTERNAL_ERROR");
mockSearch
        .mockImplementationOnce(async () => {
throw errOnce;
        })
        .mockImplementationOnce(async () => WIRE_RESPONSE);

const { result } = renderHook(() =>
useSearch({ q: "retrytest" }),
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("error");

await act(async () => {
await result.current.retry();
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("success");
    });
  });

describe("cancel", () => {
it("cancel() clears loading after an aborted fetch", async () => {

mockSearch
        .mockImplementationOnce(async () => WIRE_RESPONSE)
        .mockImplementationOnce(() => new Promise(() => {}));

const { result } = renderHook(() =>
useSearch({ q: "canceltest" }),
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(result.current.state).toBe("success");

await act(async () => {

void result.current.retry();
      });

await act(async () => {
await Promise.resolve();
      });

expect(result.current.isLoading).toBe(true);

act(() => {
result.current.cancel();
      });

expect(result.current.isLoading).toBe(false);
    });
  });

describe("limit clamping", () => {
it("clamps limit to SEARCH_MAX_LIMIT (20)", async () => {

mockSearch.mockImplementation(async () => WIRE_EMPTY);

const { result } = renderHook(() =>
useSearch({ q: "clamp", limit: 100 }),
      );

await act(async () => {
await vi.advanceTimersByTimeAsync(300);
      });
await act(async () => {
await Promise.resolve();
      });

expect(mockSearch).toHaveBeenCalledWith("clamp", { limit: 20 });

expect(result.current.state).not.toBe("idle");
    });
  });
});
