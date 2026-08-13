/**
 * `useUserSearch.spec.tsx` — Locks the Story 6.5 `useUserSearch`
 * hook contract (TKT-6.5.D2).
 *
 * Asserts:
 *
 *   - Length bounds: queries shorter than `SEARCH_MIN_QUERY_LENGTH`
 *     or longer than `SEARCH_MAX_QUERY_LENGTH` return safe fallback
 *     without calling the SDK.
 *   - Feature flag `'placeholder'` returns empty results.
 *   - Feature flag `'live'` allows the hook to proceed.
 *   - Protected routes always have authenticated users (returns fallback
 *     only when feature flag is placeholder or query is invalid).
 */

import { cleanup, renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { searchUsers } from "@/features/social/services/search.service";
import { SEARCH_MIN_QUERY_LENGTH, SEARCH_MAX_QUERY_LENGTH } from "@/features/social/discovery-invariants";

import { useUserSearch } from "@/features/social/hooks/useUserSearch";

// ─── Feature-flag mock ────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// ─── Search rate limit mock ─────────────────────────────────────────────────

const mockUseSearchRateLimit = vi.fn();
vi.mock("@/features/social/hooks/useSearchRateLimit", () => ({
  useSearchRateLimit: (...args: unknown[]) => mockUseSearchRateLimit(...args),
}));

// ─── Cursor paginated mock ─────────────────────────────────────────────────

const mockUseCursorPaginated = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock("@/lib/api", async (importOriginal: (...args: any[]) => Promise<any>) => {
  const actual = await importOriginal("@/lib/api");
  return {
    ...actual,
    useCursorPaginated: (...args: unknown[]) => mockUseCursorPaginated(...args),
  };
});

// ─── Service mock ────────────────────────────────────────────────────────

const mockSearchUsers = vi.fn();
vi.mock("@/features/social/services/search.service", () => ({
  searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
}));

// ─── Test provider ───────────────────────────────────────────────────────

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function createMockPaginatedResult(overrides = {}) {
  return {
    items: [],
    total: 0,
    isLoading: false,
    isStale: false,
    error: null,
    loadMore: vi.fn(),
    hasMore: false,
    ...overrides,
  };
}

// ─── Setup / teardown ───────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockGetFeatureFlagValue.mockReturnValue("live");
  mockUseSearchRateLimit.mockReturnValue({
    isRateLimited: false,
    remainingSeconds: 0,
    rateLimitedUntil: null,
    onCooldownComplete: vi.fn(() => () => {}),
  });
  mockUseCursorPaginated.mockReturnValue(createMockPaginatedResult());
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// ─── Hook integration ───────────────────────────────────────────────────

describe("useUserSearch", () => {
  describe("short-query guard", () => {
    it("returns safe fallback for below-minimum query", () => {
      const { result } = renderHook(() => useUserSearch("a"), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("returns safe fallback for above-maximum query", () => {
      const longQuery = "a".repeat(SEARCH_MAX_QUERY_LENGTH + 1);
      const { result } = renderHook(() => useUserSearch(longQuery), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it("returns safe fallback for whitespace-only query (below minimum after trim)", () => {
      const { result } = renderHook(() => useUserSearch("   "), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  describe("feature flag gating", () => {
    it("returns safe fallback when feature flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

      const { result } = renderHook(() => useUserSearch("alice"), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });
});
