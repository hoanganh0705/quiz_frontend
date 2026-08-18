

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { getSearchSuggestions } from "@/features/social/services/discovery.service";
import { SEARCH_MIN_QUERY_LENGTH } from "@/features/social/discovery-invariants";

import { useSearchSuggestions } from "@/features/social/hooks/useSearchSuggestions";

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

const mockUseDebouncedValue = vi.fn();
vi.mock("@/features/social/hooks/useDebouncedValue", () => ({
useDebouncedValue: (...args: unknown[]) => mockUseDebouncedValue(...args),
}));

const mockGetSearchSuggestions = vi.fn();
vi.mock("@/features/social/services/discovery.service", () => ({
getSearchSuggestions: (...args: unknown[]) => mockGetSearchSuggestions(...args),
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
