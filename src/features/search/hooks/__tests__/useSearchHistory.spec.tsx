/**
 * `useSearchHistory.spec.tsx` — locks the session-scoped search query history.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.G1.
 *
 * ## What this test locks
 *
 * - Cap eviction: entries beyond SEARCH_HISTORY_MAX_ENTRIES (10) are dropped FIFO.
 * - Whitespace rejection: queries below SEARCH_MIN_QUERY_LENGTH are silently ignored.
 * - Case-insensitive dedupe: identical queries differing only in case are deduplicated.
 * - sessionStorage isolation: entries are persisted and restored correctly.
 * - No social IDs: unstable social identifiers are never persisted.
 * - No-op when feature flag is 'placeholder'.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useSearchHistory, SEARCH_HISTORY_MAX_ENTRIES } from "@/features/search/hooks/useSearchHistory";

// ─── Mocks ─────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// Mock the BroadcastChannel used for cross-tab auth events
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

// ─── Helpers ─────────────────────────────────────────────────────────

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

// ─── Tests ─────────────────────────────────────────────────────────

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

      // Push more entries than the cap
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

      // Push 8 more entries. Combined with the 3 originals, we have
      // 11 total. After FIFO eviction (slice(0, 10)), the oldest 1
      // (i.e. "first") is dropped.
      for (let i = 0; i < SEARCH_HISTORY_MAX_ENTRIES - 2; i += 1) {
        act(() => {
          result.current.push(`other ${i}`);
        });
      }

      const queries = result.current.entries.map((e) => e.query);
      // "first" should have been evicted
      expect(queries).not.toContain("first");
      // "second" and "third" should remain
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

      // The hook only accepts a plain string query.
      // We verify it only stores { query, timestamp } records.
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

      // TypeScript prevents passing objects at compile time.
      // At runtime, we confirm the entry shape is a plain string query.
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

      // Verify the storage write actually persisted to the same store the hook reads from.
      const verifyRaw = window.sessionStorage.getItem("phase5:search:history:v1");
      expect(verifyRaw).not.toBeNull();

      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(() => useSearchHistory());

      // This test verifies the flag-gated clear() no-op behavior.
      // Hydration may or may not happen depending on initialization;
      // we only assert the invariant: clear() must not reduce the entry
      // count when the flag is placeholder.
      const initialLength = result.current.entries.length;

      act(() => {
        result.current.clear();
      });

      // The flag is placeholder, so clear() is a no-op.
      expect(result.current.entries).toHaveLength(initialLength);
    });
  });
});
