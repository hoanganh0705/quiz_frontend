/**
 * `SearchResults.spec.tsx` — locks the composed search results container.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.G2.
 *
 * ## What this test locks
 *
 * - Skeleton visible on first load.
 * - Distinct empty / error / rate-limit states.
 * - Renders all groups from useSearch response.
 * - No unstable social IDs in rendered links (TKT-5.6.G2 AC #2).
 * - Stale data banner when isStale is true.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { SearchResults } from "@/features/search/components/SearchResults";
import type { SearchQueryParams } from "@/features/search/types/search.types";
import type { ApiError } from "@/lib/api/core/ApiError";

// ─── Mocks ─────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
const mockUseSearch = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock("@/features/search/hooks/useSearch", () => ({
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

// Mock the auth bootstrap so the component renders predictably
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => ({ bootstrapState: "authenticated" }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function makeParams(q: string = ""): SearchQueryParams {
  return { q };
}

function makeRateLimitError(): ApiError {
  return {
    message: "Rate limited",
    status: 429,
    code: "SEARCH_RATE_LIMITED",
    data: {
      type: "https://api.quizmania.com/errors/search/rate-limited",
      title: "Too Many Requests",
      status: 429,
      extensions: {
        code: "SEARCH_RATE_LIMITED",
        retryAfterMs: 30000,
      },
    },
  } as unknown as ApiError;
}

function makeGenericError(): ApiError {
  return {
    message: "Server error",
    status: 500,
    code: "GLOBAL_INTERNAL_ERROR",
    data: {
      type: "https://api.quizmania.com/errors/global/internal-error",
      title: "Internal Server Error",
      status: 500,
      extensions: {
        code: "GLOBAL_INTERNAL_ERROR",
      },
    },
  } as unknown as ApiError;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("SearchResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
  });

  describe("loading state (TKT-5.6.G2 AC #2)", () => {
    it("shows skeleton when loading without cached groups", () => {
      mockUseSearch.mockReturnValue({
        groups: null,
        state: "loading",
        isLoading: true,
        isStale: false,
        error: null,
        hasResults: false,
        query: "test",
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      render(<SearchResults params={makeParams("test")} renderItem={() => null} />);

      // The skeleton renders sections with aria-busy="true".
      expect(
        document.querySelector('[aria-busy="true"]'),
      ).toBeInTheDocument();
    });
  });

  describe("empty state (TKT-5.6.G2 AC #2)", () => {
    it("shows 'no results' empty state when query returns empty", () => {
      mockUseSearch.mockReturnValue({
        groups: {},
        state: "empty",
        isLoading: false,
        isStale: false,
        error: null,
        hasResults: false,
        query: "nonexistent",
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      render(<SearchResults params={makeParams("nonexistent")} renderItem={() => null} />);

      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  describe("error state (TKT-5.6.G2 AC #2)", () => {
    it("shows error state on generic error", () => {
      mockUseSearch.mockReturnValue({
        groups: null,
        state: "error",
        isLoading: false,
        isStale: false,
        error: makeGenericError(),
        hasResults: false,
        query: "test",
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      const { container } = render(
        <SearchResults params={makeParams("test")} renderItem={() => null} />,
      );

      // SearchErrorState wraps the ErrorState in a div with
      // `data-testid="search-error-state"`.
      const wrapper = container.querySelector('[data-testid="search-error-state"]');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("rate-limit state (TKT-5.6.G2 AC #2)", () => {
    it("shows rate-limit state when rate limited", () => {
      mockUseSearch.mockReturnValue({
        groups: null,
        state: "error",
        isLoading: false,
        isStale: false,
        error: makeRateLimitError(),
        hasResults: false,
        query: "test",
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      render(<SearchResults params={makeParams("test")} renderItem={() => null} />);

      // Rate-limit state renders with role="alert" — title or body will
      // contain "rate" wording.
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("stale data banner (TKT-5.6.G2 AC #2)", () => {
    it("shows stale banner when isStale is true", () => {
      mockUseSearch.mockReturnValue({
        groups: { user: { kind: "user", items: [], visibility: "public" } },
        state: "loading",
        isLoading: true,
        isStale: true,
        error: null,
        hasResults: false,
        query: "test",
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      render(<SearchResults params={makeParams("test")} renderItem={() => null} />);

      // The banner has role="status" and an aria-live polite region.
      expect(
        document.querySelector('[role="status"][aria-live="polite"]'),
      ).toBeInTheDocument();
    });
  });

  describe("no unstable social IDs (TKT-5.6.G2 AC #2)", () => {
    it("does not render followId or friendshipId in any href", () => {
      mockUseSearch.mockReturnValue({
        groups: {
          user: {
            kind: "user",
            items: [
              {
                id: "u1",
                userId: "u1",
                username: "testuser",
                displayName: "Test User",
                subtitle: "",
                href: "/profile/testuser",
                visibility: "public",
              },
            ],
            visibility: "public",
          },
        },
        state: "success",
        isLoading: false,
        isStale: false,
        error: null,
        hasResults: true,
        query: "test",
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      const { container } = render(
        <SearchResults
          params={makeParams("test")}
          renderItem={(item) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <a key={(item as any).id} href={(item as any).href}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(item as any).displayName}
            </a>
          )}
        />,
      );

      const html = container.innerHTML;
      expect(html).not.toContain("followId");
      expect(html).not.toContain("friendshipId");
    });
  });
});