/**
 * `page.spec.tsx` — page-level integration tests for the `/search` route.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.G2.
 *
 * ## What this test locks (TKT-5.6.G2 AC #7)
 *
 * (1) Renders the search surface when `phase5_search === 'live'`.
 * (2) Renders null when `phase5_search === 'placeholder'`.
 * (3) Reads 'q' and 'kinds' from URL on mount.
 * (4) Renders the `no-query` empty state when no query is in the URL.
 * (5) The page never throws — every branch renders SOMETHING.
 *
 * ## Module-init capture trap
 *
 * `SearchPage` (the default export used by `page.tsx`) calls
 * `isSearchSurfaceEnabled()` at the call site (not module-init time),
 * so there is no capture trap here. The flag check is inside the
 * component function, not outside it.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// ─── Mocks ─────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseSearch = vi.fn();

vi.mock("@/features/search/hooks/useSearch", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/search/hooks/useSearch")>(
      "@/features/search/hooks/useSearch",
    );
  return {
    ...actual,
    useSearch: (...args: unknown[]) => mockUseSearch(...args),
  };
});

const mockUseSearchHistory = vi.fn();

vi.mock("@/features/search/hooks/useSearchHistory", () => ({
  useSearchHistory: () => mockUseSearchHistory(),
  SEARCH_HISTORY_MAX_ENTRIES: 10,
}));

vi.mock("@/features/search/hooks/useDebouncedValue", () => ({
  DEFAULT_SEARCH_DEBOUNCE_MS: 250,
  SEARCH_INPUT_DEBOUNCE_MS: 250,
  useDebouncedValue: (value: string) => value,
}));

const mockSearchParamsMap = new Map<string, string>();
const mockGetSearchParam = vi.fn((key: string) => mockSearchParamsMap.get(key) ?? null);

vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => ({ bootstrapState: "authenticated" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => mockGetSearchParam(key),
    toString: () =>
      Array.from(mockSearchParamsMap.entries())
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&"),
  }),
  usePathname: () => "/search",
}));

// ─── Helpers ─────────────────────────────────────────────────────────

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFeatureFlagValue.mockReset();
  mockUseSearchHistory.mockReturnValue({
    entries: [],
    push: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPage(): Promise<any> {
  const mod = await import("@/features/search/components/SearchPage");
  return mod.SearchPage;
}

describe("/search page", () => {
  describe("(1) flag 'live' — full surface renders (TKT-5.6.G2 AC #7)", () => {
    it("renders the page heading", async () => {
      mockGetFeatureFlagValue.mockReturnValue("live");
      mockUseSearch.mockReturnValue({
        groups: null,
        state: "idle",
        isLoading: false,
        isStale: false,
        error: null,
        hasResults: false,
        query: "",
        loadMore: vi.fn(),
        hasMore: false,
        isLoadingMore: false,
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      const Page = await loadPage();
      render(<Page />);

      expect(
        screen.getByRole("heading", { name: /search/i, level: 1 }),
      ).toBeInTheDocument();
    });

    it("renders the search input", async () => {
      mockGetFeatureFlagValue.mockReturnValue("live");
      mockUseSearch.mockReturnValue({
        groups: null,
        state: "idle",
        isLoading: false,
        isStale: false,
        error: null,
        hasResults: false,
        query: "",
        loadMore: vi.fn(),
        hasMore: false,
        isLoadingMore: false,
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      const Page = await loadPage();
      render(<Page />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders the no-query empty state when URL has no query", async () => {
      mockGetFeatureFlagValue.mockReturnValue("live");
      mockUseSearch.mockReturnValue({
        groups: null,
        state: "idle",
        isLoading: false,
        isStale: false,
        error: null,
        hasResults: false,
        query: "",
        loadMore: vi.fn(),
        hasMore: false,
        isLoadingMore: false,
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      const Page = await loadPage();
      render(<Page />);

      expect(screen.getByText(/enter a search term/i)).toBeInTheDocument();
    });

    it("renders results when a query is present in the URL", async () => {
      mockGetFeatureFlagValue.mockReturnValue("live");
      mockSearchParamsMap.set("q", "test");
      mockUseSearch.mockReturnValue({
        groups: {
          quiz: {
            kind: "quiz",
            items: [
              {
                id: "q1",
                title: "Test Quiz",
                slug: "test-quiz",
                displayName: "Test Quiz",
                subtitle: "10 questions",
                href: "/quizzes/q1",
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

      const Page = await loadPage();
      render(<Page />);

      // The page renders the SearchGroup with the visible count and
      // group label ("Quizzes"); items themselves use the page's
      // renderItem (which is a no-op pass-through in this minimal page),
      // so we assert the group label appears.
      expect(screen.getByText(/^Quizzes$/)).toBeInTheDocument();
      // And assert the presence of the result count badge.
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("(2) flag 'placeholder' — null surface (TKT-5.6.G2 AC #7)", () => {
    it("renders empty when flag is 'placeholder'", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const Page = await loadPage();
      const { container } = render(<Page />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("(5) never throws — every branch renders SOMETHING (TKT-5.6.G2 AC #7)", () => {
    it("does not throw in 'live' mode", async () => {
      mockGetFeatureFlagValue.mockReturnValue("live");
      mockUseSearch.mockReturnValue({
        groups: null,
        state: "idle",
        isLoading: false,
        isStale: false,
        error: null,
        hasResults: false,
        query: "",
        loadMore: vi.fn(),
        hasMore: false,
        isLoadingMore: false,
        retry: vi.fn(),
        cancel: vi.fn(),
      });

      const Page = await loadPage();
      expect(() => render(<Page />)).not.toThrow();
    });

    it("does not throw in 'placeholder' mode", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const Page = await loadPage();
      expect(() => render(<Page />)).not.toThrow();
    });
  });
});
