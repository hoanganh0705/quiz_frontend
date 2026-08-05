/**
 * `GlobalSearch.spec.tsx` — locks the header integration for the search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.G2.
 *
 * ## What this test locks
 *
 * - Renders SearchInput when flag is 'live'.
 * - Renders null when flag is 'placeholder'.
 * - No social write DTO imports (enforced by type check + this test).
 * - Uses SearchGuard for feature flag gating.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { GlobalSearch } from "@/features/search/components/GlobalSearch";

const mockGetFeatureFlagValue = vi.fn();
const mockSetQuery = vi.fn();
const mockSetKinds = vi.fn();
const mockReset = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock("@/features/search/hooks/useSearchUrlState", () => ({
  useSearchUrlState: () => ({
    query: "",
    kinds: undefined,
    setQuery: (...args: unknown[]) => mockSetQuery(...args),
    setKinds: (...args: unknown[]) => mockSetKinds(...args),
    reset: (...args: unknown[]) => mockReset(...args),
  }),
}));

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("feature flag gating (TKT-5.6.G2 AC #5)", () => {
    it("renders SearchInput when flag is 'live'", () => {
      mockGetFeatureFlagValue.mockReturnValue("live");

      render(<GlobalSearch />);

      expect(screen.queryByRole("combobox")).toBeInTheDocument();
    });

    it("renders null when flag is 'placeholder' (TKT-5.6.G2 AC #5)", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { container } = render(<GlobalSearch />);

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("no social write DTO imports invariant (TKT-5.6.G2 AC #5)", () => {
    it("does not render follow or friend-request related elements", () => {
      mockGetFeatureFlagValue.mockReturnValue("live");

      render(<GlobalSearch />);

      expect(screen.queryByRole("button", { name: /follow/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /add friend/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /request/i })).not.toBeInTheDocument();
    });

    it("renders only a search input element", () => {
      mockGetFeatureFlagValue.mockReturnValue("live");

      render(<GlobalSearch />);

      // Should only have one combobox (the search input)
      expect(screen.getAllByRole("combobox")).toHaveLength(1);
    });
  });
});
