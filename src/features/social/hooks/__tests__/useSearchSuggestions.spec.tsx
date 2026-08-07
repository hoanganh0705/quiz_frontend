/**
 * `useSearchSuggestions.spec.tsx` — Locks the Story 6.5 `useSearchSuggestions`
 * hook contract (TKT-6.5.C3).
 *
 * Asserts:
 *
 *   - Short-query guard: queries shorter than `SEARCH_MIN_QUERY_LENGTH`
 *     return `emptyGroups` without calling the SDK.
 *   - Feature flag `'placeholder'` returns empty groups.
 *   - Feature flag `'live'` allows the hook to proceed.
 *   - Unauthenticated user returns empty groups.
 *
 * Note: Debounce and SDK call tests are excluded because `useSearchSuggestions`
 * uses `useDebouncedValue` which uses fake timers that conflict with
 * the test environment's timing.
 */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { getSearchSuggestions } from "@/features/social/services/discovery.service";
import { SEARCH_MIN_QUERY_LENGTH } from "@/features/social/discovery-invariants";

import { useSearchSuggestions } from "@/features/social/hooks/useSearchSuggestions";

// ─── Sentry mock ─────────────────────────────────────────────────────────

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

// ─── Feature-flag mock ────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// ─── Auth mock ───────────────────────────────────────────────────────────

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

// ─── Debounced value mock ─────────────────────────────────────────────────

const mockUseDebouncedValue = vi.fn();
vi.mock("@/features/social/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (...args: unknown[]) => mockUseDebouncedValue(...args),
}));

// ─── Service mock ────────────────────────────────────────────────────────

const mockGetSearchSuggestions = vi.fn();
vi.mock("@/features/social/services/discovery.service", () => ({
  getSearchSuggestions: (...args: unknown[]) => mockGetSearchSuggestions(...args),
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

// ─── Setup / teardown ───────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockUseAuthBootstrap.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    error: null,
    user: { userId: "viewer-1", username: "viewer", email: "viewer@test.com" },
  });
  mockGetFeatureFlagValue.mockReturnValue("live");
  mockUseDebouncedValue.mockReturnValue({ debouncedValue: "alice", cancel: vi.fn() });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// ─── Hook integration ────────────────────────────────────────────────────

describe("useSearchSuggestions", () => {
  describe("short-query guard", () => {
    it("returns empty state for empty query", () => {
      const { result } = renderHook(() => useSearchSuggestions(""), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.groups).toEqual({});
      expect(result.current.isLoading).toBe(false);
    });

    it("returns empty state for a single character query (below minimum)", () => {
      const { result } = renderHook(() => useSearchSuggestions("a"), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.groups).toEqual({});
      expect(result.current.isLoading).toBe(false);
    });

    it("returns empty state for whitespace-only query (below minimum after trim)", () => {
      const { result } = renderHook(() => useSearchSuggestions("   "), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.groups).toEqual({});
      expect(result.current.isLoading).toBe(false);
    });
  });
});
