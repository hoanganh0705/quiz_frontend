/**
 * `search-route.spec.tsx` — Locks the `/social/users/search` route contract
 * (TKT-6.5.G2).
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SearchRoute from "@/app/social/users/search/page";

// ─── Mock all dependencies ─────────────────────────────────────────────────

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockSocialSearchPlaceholder = vi.fn(() => (
  <div data-testid="social-search-placeholder">Placeholder</div>
));
vi.mock("@/features/social/components/SocialSearchPlaceholder", () => ({
  SocialSearchPlaceholder: () => mockSocialSearchPlaceholder(),
}));

const mockUserSearchResults = vi.fn(() => (
  <div data-testid="user-search-results">Live Results</div>
));
vi.mock("@/features/social/lists/UserSearchResults", () => ({
  UserSearchResults: () => mockUserSearchResults(),
}));

const mockUseSearchParams = vi.fn();
const mockUseRouter = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => mockUseRouter(),
  usePathname: () => mockUsePathname(),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────

const authenticatedUser = {
  isAuthenticated: true,
  isBootstrapping: false,
  isDegraded: false,
  error: null as Error | null,
  profileError: null as Error | null,
  currentUser: null,
  user: { userId: "user-1", username: "testuser", email: "test@test.com" } as any,
  refetch: vi.fn(),
  clearBootstrap: vi.fn(),
};

const mockSearchParams = new URLSearchParams();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFeatureFlagValue.mockReturnValue("placeholder");
  mockUseAuthBootstrap.mockReturnValue(authenticatedUser);
  mockUseSearchParams.mockReturnValue(mockSearchParams);
  mockUseRouter.mockReturnValue({ replace: vi.fn() });
  mockUsePathname.mockReturnValue("/social/users/search");
});

describe("SearchRoute", () => {
  describe("placeholder branch", () => {
    it("renders SocialSearchPlaceholder when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

      render(<SearchRoute />);

      expect(screen.getByTestId("social-search-placeholder")).toBeInTheDocument();
    });
  });

  describe("live branch", () => {
    it("renders UserSearchResults when flag is live and user is authenticated", async () => {
      mockGetFeatureFlagValue.mockReturnValueOnce("live");

      render(<SearchRoute />);

      await waitFor(() => {
        expect(screen.getByTestId("user-search-results")).toBeInTheDocument();
      });
    });
  });

  describe("auth handling", () => {
    it("renders placeholder when user is not authenticated", () => {
      mockGetFeatureFlagValue.mockReturnValueOnce("live");
      mockUseAuthBootstrap.mockReturnValueOnce({
        isAuthenticated: false,
        isBootstrapping: false,
        isDegraded: false,
        error: null,
        profileError: null,
        currentUser: null,
        user: null,
        refetch: vi.fn(),
        clearBootstrap: vi.fn(),
      });

      render(<SearchRoute />);

      // Falls back to placeholder for unauthenticated users
      expect(screen.getByTestId("social-search-placeholder")).toBeInTheDocument();
    });

    it("renders loading state while auth is loading", () => {
      mockGetFeatureFlagValue.mockReturnValueOnce("live");
      mockUseAuthBootstrap.mockReturnValueOnce({
        isAuthenticated: false,
        isBootstrapping: true,
        isDegraded: false,
        error: null,
        profileError: null,
        currentUser: null,
        user: null,
        refetch: vi.fn(),
        clearBootstrap: vi.fn(),
      });

      const { container } = render(<SearchRoute />);

      // Loading spinner should be present
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });
});
