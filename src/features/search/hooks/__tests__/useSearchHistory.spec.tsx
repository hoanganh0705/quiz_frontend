

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useSearchHistory, SEARCH_HISTORY_MAX_ENTRIES } from "@/features/search/hooks/useSearchHistory";

const mockGetFeatureFlagValue = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock("@/lib/api/core/broadcast-channel", async () => {
const actual = await vi.importActual<typeof import("@/lib/api/core/broadcast-channel")>(
"@/lib/api/core/broadcast-channel",
  );
return {
...actual,
subscribeToAuthEvents: vi.fn(() => () => {}),
initAuthChannel: vi.fn(),
  };
});

function getStoredEntries(): Array<{ query: string; timestamp: number }> {
const raw = window.sessionStorage.getItem("phase5:search:history:v1");
if (!raw) return [];
try {
return JSON.parse(raw);
  } catch {
return [];
  }
}

function setStoredEntries(
entries: Array<{ query: string; timestamp: number }>,
): void {
window.sessionStorage.setItem(
"phase5:search:history:v1",
JSON.stringify(entries),
  );
}

describe("useSearchHistory", () => {
beforeEach(() => {
vi.clearAllMocks();
window.sessionStorage.clear();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
vi.restoreAllMocks();
  });

describe("initialization", () => {
it("returns empty entries on first render", () => {
const { result } = renderHook(() => useSearchHistory());
expect(result.current.entries).toEqual([]);
    });

it("restores entries from sessionStorage on mount", () => {
setStoredEntries([
{ query: "restored query", timestamp: Date.now() },
      ]);

const { result } = renderHook(() => useSearchHistory());
expect(result.current.entries).toHaveLength(1);
expect(result.current.entries[0]?.query).toBe("restored query");
    });

it("returns empty entries when sessionStorage is unavailable", () => {
const originalGetItem = window.sessionStorage.getItem.bind(window.sessionStorage);
const getItemSpy = vi
        .spyOn(window.sessionStorage, "getItem")
        .mockImplementationOnce(() => {
throw new Error("storage unavailable");
        });

const { result } = renderHook(() => useSearchHistory());
expect(result.current.entries).toEqual([]);

getItemSpy.mockRestore();
originalGetItem;
    });
  });

describe("cap eviction (FIFO)", () => {
it("keeps at most SEARCH_HISTORY_MAX_ENTRIES entries", () => {
const { result } = renderHook(() => useSearchHistory());

for (let i = 0; i < SEARCH_HISTORY_MAX_ENTRIES + 5; i += 1) {
act(() => {
result.current.push(`query ${i}`);
        });
      }

expect(result.current.entries).toHaveLength(SEARCH_HISTORY_MAX_ENTRIES);
    });

it("drops the oldest entries first (FIFO)", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("first");
result.current.push("second");
result.current.push("third");
      });

for (let i = 0; i < SEARCH_HISTORY_MAX_ENTRIES - 2; i += 1) {
act(() => {
result.current.push(`other ${i}`);
        });
      }

const queries = result.current.entries.map((e) => e.query);

expect(queries).not.toContain("first");

expect(queries).toContain("second");
expect(queries).toContain("third");
    });
  });

describe("whitespace rejection", () => {
it("ignores empty string", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("");
      });

expect(result.current.entries).toHaveLength(0);
    });

it("ignores whitespace-only string", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("    ");
      });

expect(result.current.entries).toHaveLength(0);
    });

it("ignores query below minimum length", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("a");
      });

expect(result.current.entries).toHaveLength(0);
    });

it("accepts query at minimum length (2 characters)", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("ab");
      });

expect(result.current.entries).toHaveLength(1);
expect(result.current.entries[0]?.query).toBe("ab");
    });
  });

describe("case-insensitive dedupe", () => {
it("does not create a duplicate when query differs only in case", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("Test Query");
result.current.push("TEST QUERY");
      });

expect(result.current.entries).toHaveLength(1);
    });

it("does not create a duplicate with leading/trailing whitespace differences", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("  test  ");
result.current.push("test");
      });

expect(result.current.entries).toHaveLength(1);
    });

it("adds a new entry if the same query is pushed again (moves to top)", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("original");
result.current.push("another");
result.current.push("original");
      });

expect(result.current.entries).toHaveLength(2);
expect(result.current.entries[0]?.query).toBe("original");
    });
  });

describe("sessionStorage persistence", () => {
it("writes to sessionStorage on push", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("persist me");
      });

const stored = getStoredEntries();
expect(stored).toHaveLength(1);
expect(stored[0]?.query).toBe("persist me");
    });

it("clears sessionStorage on clear()", () => {
setStoredEntries([
{ query: "to be cleared", timestamp: Date.now() },
      ]);

const { result } = renderHook(() => useSearchHistory());
expect(result.current.entries).toHaveLength(1);

act(() => {
result.current.clear();
      });

expect(getStoredEntries()).toHaveLength(0);
    });

it("removes a specific query from sessionStorage on remove()", () => {
setStoredEntries([
{ query: "keep", timestamp: Date.now() },
{ query: "remove me", timestamp: Date.now() },
      ]);

const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.remove("remove me");
      });

const stored = getStoredEntries();
expect(stored).toHaveLength(1);
expect(stored[0]?.query).toBe("keep");
    });
  });

describe("no social IDs invariant", () => {
it("never persists followId in the stored entry", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("some query");
      });

const stored = getStoredEntries();
expect(stored[0]).toHaveProperty("query");
expect(stored[0]).toHaveProperty("timestamp");
expect(stored[0]).not.toHaveProperty("followId");
expect(stored[0]).not.toHaveProperty("friendshipId");
    });

it("only accepts a plain string in push()", () => {
const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("plain query string");
      });

const stored = getStoredEntries();
expect(typeof stored[0]?.query).toBe("string");
    });
  });

describe("feature flag 'placeholder' no-op", () => {
it("returns empty entries when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

const { result } = renderHook(() => useSearchHistory());

expect(result.current.entries).toHaveLength(0);
    });

it("push() is a no-op when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

const { result } = renderHook(() => useSearchHistory());

act(() => {
result.current.push("should be ignored");
      });

expect(result.current.entries).toHaveLength(0);
expect(getStoredEntries()).toHaveLength(0);
    });

it("clear() is a no-op when flag is placeholder", () => {
setStoredEntries([
{ query: "persisted", timestamp: Date.now() },
      ]);

const verifyRaw = window.sessionStorage.getItem("phase5:search:history:v1");
expect(verifyRaw).not.toBeNull();

mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(() => useSearchHistory());

const initialLength = result.current.entries.length;

act(() => {
result.current.clear();
      });

expect(result.current.entries).toHaveLength(initialLength);
    });
  });
});
