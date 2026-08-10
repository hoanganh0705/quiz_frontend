/**
 * `suggestions-route.spec.tsx` — Locks the `/social/suggestions` route contract
 * (TKT-6.5.G1).
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SuggestionsRoute from "@/app/(protected)/social/suggestions/page";

// ─── Mock all dependencies ─────────────────────────────────────────────────

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockSocialDiscoveryPlaceholder = vi.fn(() => (
  <div data-testid="social-discovery-placeholder">Placeholder</div>
));
vi.mock("@/features/social/components/SocialDiscoveryPlaceholder", () => ({
  SocialDiscoveryPlaceholder: () => mockSocialDiscoveryPlaceholder(),
}));

const mockSuggestionsPanel = vi.fn(() => (
  <div data-testid="suggestions-panel">Live Panel</div>
));
vi.mock("@/features/social/lists/SuggestionsPanel", () => ({
  SuggestionsPanel: () => mockSuggestionsPanel(),
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

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFeatureFlagValue.mockReturnValue("placeholder");
  mockUseAuthBootstrap.mockReturnValue(authenticatedUser);
});

describe("SuggestionsRoute", () => {
  describe("placeholder branch", () => {
    it("renders SocialDiscoveryPlaceholder when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

      render(<SuggestionsRoute />);

      expect(screen.getByTestId("social-discovery-placeholder")).toBeInTheDocument();
      expect(mockSuggestionsPanel).not.toHaveBeenCalled();
    });
  });

  describe("live branch", () => {
    it("renders SuggestionsPanel when flag is live and user is authenticated", () => {
      mockGetFeatureFlagValue.mockReturnValueOnce("live");

      render(<SuggestionsRoute />);

      expect(screen.getByTestId("suggestions-panel")).toBeInTheDocument();
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

      render(<SuggestionsRoute />);

      // Falls back to placeholder for unauthenticated users
      expect(screen.getByTestId("social-discovery-placeholder")).toBeInTheDocument();
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

      const { container } = render(<SuggestionsRoute />);

      // Loading spinner should be present
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });
});
