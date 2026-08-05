/**
 * `useSearchUrlState.spec.tsx` — locks the URL state synchronisation for the search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.G1.
 *
 * ## What this test locks
 *
 * - URL hydration: initial state is read from useSearchParams on mount.
 * - Debounced write: setQuery coalesces rapid calls before writing to the URL.
 * - Immediate write: setKinds writes to the URL without debounce.
 * - reset(): clears both query and kinds from the URL.
 * - No unstable social IDs: the hook only writes 'q' and 'kinds' params.
 * - Back/forward navigation: rehydration from URL changes.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useSearchUrlState } from "@/features/search/hooks/useSearchUrlState";

// ─── Mocks ─────────────────────────────────────────────────────────

const mockRouterReplace = vi.fn();
const mockUseSearchParams = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    replace: mockRouterReplace,
  })),
  useSearchParams: vi.fn(() => mockUseSearchParams()),
  usePathname: vi.fn(() => mockUsePathname()),
}));

vi.mock("@/features/search/hooks/useDebouncedValue", () => ({
  DEFAULT_SEARCH_DEBOUNCE_MS: 250,
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockSearchParams(entries: Array<[string, string]> = []) {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    params.set(key, value);
  }
  return params;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("useSearchUrlState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/search");
    mockUseSearchParams.mockReturnValue(createMockSearchParams());
    mockRouterReplace.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("defaults to empty query and kinds when no URL params are present", () => {
      mockUseSearchParams.mockReturnValue(createMockSearchParams());

      const { result } = renderHook(() => useSearchUrlState());

      expect(result.current.query).toBe("");
      expect(result.current.kinds).toEqual([]);
    });

    it("reads 'q' from URL on mount", () => {
      mockUseSearchParams.mockReturnValue(createMockSearchParams([["q", "test query"]]));

      const { result } = renderHook(() => useSearchUrlState());

      expect(result.current.query).toBe("test query");
    });

    it("reads 'kinds' from URL on mount", () => {
      mockUseSearchParams.mockReturnValue(
        createMockSearchParams([["kinds", "quiz,user,tournament"]]),
      );

      const { result } = renderHook(() => useSearchUrlState());

      expect(result.current.kinds).toEqual(["quiz", "user", "tournament"]);
    });

    it("ignores unknown kind values in 'kinds' param", () => {
      mockUseSearchParams.mockReturnValue(
        createMockSearchParams([["kinds", "quiz,unknown,tournament"]]),
      );

      const { result } = renderHook(() => useSearchUrlState());

      expect(result.current.kinds).toEqual(["quiz", "tournament"]);
    });

    it("trims whitespace from the query on hydration", () => {
      mockUseSearchParams.mockReturnValue(createMockSearchParams([["q", "  trimmed  "]]));

      const { result } = renderHook(() => useSearchUrlState());

      expect(result.current.query).toBe("trimmed");
    });
  });

  describe("setQuery (debounced)", () => {
    it("does not write to URL before the debounce delay", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("new query");
      });

      vi.advanceTimersByTime(200);
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it("writes to URL after the debounce delay", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("debounced query");
      });

      vi.advanceTimersByTime(250);
      // Use a regex to match the URL — the exact encoding of space
      // may be %20 or + depending on the implementation.
      expect(mockRouterReplace).toHaveBeenCalledWith(
        expect.stringMatching(/^\/search\?q=debounced(%20|\+)query$/),
      );
    });

    it("omits 'q' param from URL when query is empty", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("");
      });

      vi.advanceTimersByTime(250);
      expect(mockRouterReplace).toHaveBeenCalledWith("/search");
    });

    it("trims whitespace before writing to URL", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("  spaces  ");
      });

      vi.advanceTimersByTime(250);
      expect(mockRouterReplace).toHaveBeenCalledWith("/search?q=spaces");
    });

    it("cancels the pending write on rapid subsequent calls", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("first");
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.setQuery("second");
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.setQuery("third");
      });

      vi.advanceTimersByTime(250);
      // Only the third query should be written
      expect(mockRouterReplace).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith("/search?q=third");
    });

    it("preserves existing 'kinds' when writing 'q'", () => {
      mockUseSearchParams.mockReturnValue(
        createMockSearchParams([["kinds", "quiz,user"]]),
      );

      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("combined");
      });

      vi.advanceTimersByTime(250);
      expect(mockRouterReplace).toHaveBeenCalledWith(
        expect.stringMatching(/^\/search\?q=combined&kinds=quiz(%2C|,)user$/),
      );
    });
  });

  describe("setKinds (immediate)", () => {
    it("writes to URL immediately without debounce", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setKinds(["quiz", "tournament"]);
      });

      expect(mockRouterReplace).toHaveBeenCalled();
      // Should not wait for debounce
      expect(mockRouterReplace).toHaveBeenCalledTimes(1);
    });

    it("omits 'kinds' param when selection is empty", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setKinds([]);
      });

      // Empty kinds = no param
      expect(mockRouterReplace).toHaveBeenCalledWith("/search");
    });

    it("writes 'kinds' sorted for stable URLs", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setKinds(["tournament", "quiz", "user"]);
      });

      expect(mockRouterReplace).toHaveBeenCalledWith(
        expect.stringMatching(/^\/search\?kinds=quiz(%2C|,)(tournament|user)/),
      );
    });

    it("preserves existing 'q' when writing 'kinds'", () => {
      mockUseSearchParams.mockReturnValue(
        createMockSearchParams([["q", "existing"]]),
      );

      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setKinds(["quiz"]);
      });

      expect(mockRouterReplace).toHaveBeenCalledWith("/search?q=existing&kinds=quiz");
    });
  });

  describe("reset()", () => {
    it("clears both 'q' and 'kinds' from the URL", () => {
      mockUseSearchParams.mockReturnValue(
        createMockSearchParams([
          ["q", "to reset"],
          ["kinds", "quiz,user"],
        ]),
      );

      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.reset();
      });

      expect(mockRouterReplace).toHaveBeenCalledWith("/search");
    });

    it("resets local state to empty", () => {
      mockUseSearchParams.mockReturnValue(
        createMockSearchParams([["q", "before reset"]]),
      );

      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.reset();
      });

      expect(result.current.query).toBe("");
      expect(result.current.kinds).toEqual([]);
    });

    it("cancels any pending debounced write", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("pending");
      });
      act(() => {
        result.current.reset();
      });

      vi.advanceTimersByTime(300);
      // No URL write should happen for the pending query
      expect(mockRouterReplace).toHaveBeenCalledTimes(1); // only the reset write
      expect(mockRouterReplace).toHaveBeenCalledWith("/search");
    });
  });

  describe("no unstable social IDs invariant", () => {
    it("never writes followId to the URL", () => {
      const { result } = renderHook(() => useSearchUrlState());

      act(() => {
        result.current.setQuery("some query");
      });
      act(() => {
        result.current.setKinds(["user"]);
      });
      vi.advanceTimersByTime(250);

      const calls = mockRouterReplace.mock.calls;
      for (const [url] of calls) {
        expect(url).not.toContain("followId");
        expect(url).not.toContain("friendshipId");
      }
    });
  });

  describe("rehydration from URL changes", () => {
    it("reads updated 'q' when useSearchParams changes (back/forward nav)", () => {
      const { result, rerender } = renderHook(() => useSearchUrlState());

      expect(result.current.query).toBe("");

      // Simulate back/forward navigation
      mockUseSearchParams.mockReturnValue(
        createMockSearchParams([["q", "hydrated from url"]]),
      );

      rerender();

      expect(result.current.query).toBe("hydrated from url");
    });
  });
});
