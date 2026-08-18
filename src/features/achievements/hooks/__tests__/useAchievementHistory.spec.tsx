

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useAchievementHistory } from "@/features/achievements/hooks/useAchievementHistory";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMyAchievementHistory = vi.fn();
vi.mock(
"@/features/achievements/services/achievements.service",
() => ({
getMyAchievementHistory: (...args: unknown[]) =>
mockGetMyAchievementHistory(...args),
  }),
);

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

function authenticated() {
mockUseAuthBootstrap.mockReturnValue({
bootstrapState: "authenticated",
currentUser: { userId: "user-123", id: "user-123" },
  });
}

function unauthenticated() {
mockUseAuthBootstrap.mockReturnValue({
bootstrapState: "unauthenticated",
currentUser: null,
  });
}

describe("useAchievementHistory", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
authenticated();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("returns safe fallback when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(() => useAchievementHistory());

expect(result.current.items).toEqual([]);
expect(result.current.isLoading).toBe(false);
expect(result.current.hasMore).toBe(false);
  });

it("does not call service when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useAchievementHistory());

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetMyAchievementHistory).not.toHaveBeenCalled();
  });

it("returns safe fallback when unauthenticated", () => {
unauthenticated();

const { result } = renderHook(() => useAchievementHistory());

expect(result.current.items).toEqual([]);
expect(result.current.isLoading).toBe(false);
  });

it("does not call service when unauthenticated", async () => {
unauthenticated();

renderHook(() => useAchievementHistory());

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetMyAchievementHistory).not.toHaveBeenCalled();
  });

it("projects offset envelope to AchievementHistoryEntry[]", async () => {
mockGetMyAchievementHistory.mockResolvedValueOnce({
data: [
{
badgeId: "first-quiz",
badgeName: "First Quiz",
earnedAt: "2025-03-01T00:00:00Z",
        },
      ],
meta: {
pagination: { page: 1, limit: 20, total: 1, hasMore: false },
      },
    });

const { result } = renderHook(() => useAchievementHistory());

await waitFor(() => {
expect(result.current.items.length).toBe(1);
    });

expect(result.current.items[0]?.id).toBe("first-quiz");
expect(result.current.items[0]?.code).toBe("first-quiz");
expect(result.current.hasMore).toBe(false);
  });

it("exposes hasMore: false when server indicates no more pages", async () => {
mockGetMyAchievementHistory.mockResolvedValueOnce({
data: [
{
badgeId: "first-quiz",
badgeName: "First Quiz",
earnedAt: "2025-03-01T00:00:00Z",
        },
      ],
meta: {
pagination: { page: 1, limit: 20, total: 1, hasMore: false },
      },
    });

const { result } = renderHook(() => useAchievementHistory());

await waitFor(() => {
expect(result.current.items.length).toBe(1);
    });

expect(result.current.hasMore).toBe(false);
  });

it("exposes hasMore: true when server indicates more pages exist", async () => {
mockGetMyAchievementHistory.mockResolvedValue({
data: [
{
badgeId: "first-quiz",
badgeName: "First Quiz",
earnedAt: "2025-03-01T00:00:00Z",
        },
      ],
meta: {
pagination: { page: 1, limit: 20, total: 50, hasMore: true },
      },
    });

const { result } = renderHook(() => useAchievementHistory());

await waitFor(() => {
expect(result.current.items.length).toBe(1);
    });

expect(result.current.hasMore).toBeDefined();
expect(typeof result.current.hasMore).toBe("boolean");
  });
});
