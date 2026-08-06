/**
 * `SocialSearchGroup.spec.tsx` — Locks the SocialSearchGroup component contract
 * (TKT-6.5.F4).
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SocialSearchGroup } from "@/features/social/discovery/SocialSearchGroup";
import { DEFENSIVE_FALLBACK_TESTID } from "@/features/social/discovery-discriminator";

// ─── Mock all dependencies ─────────────────────────────────────────────────

const mockUseSearchSuggestions = vi.fn();
vi.mock("@/features/social/hooks/useSearchSuggestions", () => ({
  useSearchSuggestions: (..._args: unknown[]) => mockUseSearchSuggestions(),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────

const successGroups = {
  user: ["alice", "bob"],
  quiz: ["General Knowledge"],
  tag: ["science"],
  group: ["Quiz Masters"],
};

const successResult = {
  groups: successGroups,
  isLoading: false,
  error: null,
  wasStale: false,
};

beforeEach(() => {
  mockUseSearchSuggestions.mockReset();
  mockUseSearchSuggestions.mockReturnValue(successResult);
});

describe("SocialSearchGroup", () => {
  describe("below-minimum query", () => {
    it("renders nothing for empty query", () => {
      render(<SocialSearchGroup query="" />);

      expect(screen.queryByTestId("social-search-group")).not.toBeInTheDocument();
    });

    it("renders nothing for single character query", () => {
      render(<SocialSearchGroup query="a" />);

      expect(screen.queryByTestId("social-search-group")).not.toBeInTheDocument();
    });

    it("renders nothing for whitespace-only query", () => {
      render(<SocialSearchGroup query="   " />);

      expect(screen.queryByTestId("social-search-group")).not.toBeInTheDocument();
    });
  });

  describe("rate-limit state", () => {
    it("renders rate-limit notice for GLOBAL_RATE_LIMITED error", () => {
      const error = new Error("Rate limited") as Error & { code: string };
      Object.defineProperty(error, "code", {
        value: "GLOBAL_RATE_LIMITED",
        configurable: true,
      });

      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {},
        isLoading: false,
        error,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByTestId("social-search-group")).toBeInTheDocument();
      expect(screen.getByTestId("social-search-group")).toHaveAttribute("data-mode", "rate-limit");
    });

    it("renders rate-limit notice for SOCIAL_SEARCH_RATE_LIMITED error", () => {
      const error = new Error("Rate limited") as Error & { code: string };
      Object.defineProperty(error, "code", {
        value: "SOCIAL_SEARCH_RATE_LIMITED",
        configurable: true,
      });

      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {},
        isLoading: false,
        error,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByTestId("social-search-group")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("renders skeleton when loading", () => {
      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {},
        isLoading: true,
        error: null,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByTestId("social-search-group")).toHaveAttribute("data-mode", "loading");
    });
  });

  describe("empty state", () => {
    it("renders empty state when no groups", () => {
      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {},
        isLoading: false,
        error: null,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByTestId("social-search-group")).toHaveAttribute("data-mode", "empty");
    });
  });

  describe("error state", () => {
    it("renders error state for other errors", () => {
      const error = new Error("Server error") as Error & { code: string };
      Object.defineProperty(error, "code", {
        value: "GLOBAL_INTERNAL_ERROR",
        configurable: true,
      });

      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {},
        isLoading: false,
        error,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByTestId("social-search-group")).toHaveAttribute("data-mode", "error");
    });
  });

  describe("populated state", () => {
    it("renders results mode when groups are present", () => {
      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByTestId("social-search-group")).toHaveAttribute("data-mode", "results");
    });

    it("renders user items with correct links", () => {
      render(<SocialSearchGroup query="alice" />);

      const userLinks = screen.getAllByTestId(/social-search-group-user-item/);
      expect(userLinks).toHaveLength(2);
      expect(userLinks[0]).toHaveAttribute("href", "/users/alice");
      expect(userLinks[1]).toHaveAttribute("href", "/users/bob");
    });

    it("renders quiz items with search links", () => {
      render(<SocialSearchGroup query="alice" />);

      const quizLinks = screen.getAllByTestId(/social-search-group-quiz-item/);
      expect(quizLinks).toHaveLength(1);
      expect(quizLinks[0]).toHaveAttribute("href", "/search?q=General%20Knowledge");
    });
  });

  describe("unsupported kind fallback", () => {
    it("renders unsupported items with DEFENSIVE_FALLBACK_TESTID", () => {
      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {
          user: ["alice"],
          unsupported: ["garbage", "unknown_kind"],
        },
        isLoading: false,
        error: null,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getAllByTestId(DEFENSIVE_FALLBACK_TESTID)).toHaveLength(1);
    });

    it("renders unsupported items as text", () => {
      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {
          unsupported: ["garbage", "unknown_kind"],
        },
        isLoading: false,
        error: null,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByText("garbage")).toBeInTheDocument();
      expect(screen.getByText("unknown_kind")).toBeInTheDocument();
    });
  });

  describe("group headers", () => {
    it("renders 'People' header for user group", () => {
      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByText("People")).toBeInTheDocument();
    });

    it("renders 'Quizzes' header for quiz group", () => {
      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByText("Quizzes")).toBeInTheDocument();
    });

    it("renders 'Tags' header for tag group", () => {
      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("renders 'Groups' header for group group", () => {
      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByText("Groups")).toBeInTheDocument();
    });

    it("renders 'Results' header for unsupported group", () => {
      mockUseSearchSuggestions.mockReturnValueOnce({
        groups: {
          unsupported: ["garbage"],
        },
        isLoading: false,
        error: null,
        wasStale: false,
      });

      render(<SocialSearchGroup query="alice" />);

      expect(screen.getByText("Results")).toBeInTheDocument();
    });
  });
});
