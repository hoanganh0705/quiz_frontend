

import { cleanup, renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { searchUsers } from "@/features/social/services/search.service";
import { SEARCH_MIN_QUERY_LENGTH, SEARCH_MAX_QUERY_LENGTH } from "@/features/social/discovery-invariants";

import { useUserSearch } from "@/features/social/hooks/useUserSearch";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseSearchRateLimit = vi.fn();
vi.mock("@/features/social/hooks/useSearchRateLimit", () => ({
useSearchRateLimit: (...args: unknown[]) => mockUseSearchRateLimit(...args),
}));

const mockUseCursorPaginated = vi.fn();

vi.mock("@/lib/api", async (importOriginal: (...args: any[]) => Promise<any>) => {
const actual = await importOriginal("@/lib/api");
return {
...actual,
useCursorPaginated: (...args: unknown[]) => mockUseCursorPaginated(...args),
  };
});

const mockSearchUsers = vi.fn();
vi.mock("@/features/social/services/search.service", () => ({
searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
}));

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
