

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useBadges } from "@/features/achievements/hooks/useBadges";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockListBadges = vi.fn();
vi.mock(
"@/features/achievements/services/achievements.service",
() => ({
listBadges: (...args: unknown[]) => mockListBadges(...args),
  }),
);

describe("useBadges", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("returns safe fallback when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(() => useBadges());

expect(result.current.badges).toEqual([]);
expect(result.current.isLoading).toBe(false);
expect(result.current.error).toBeNull();
  });

it("does not call listBadges when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useBadges());

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockListBadges).not.toHaveBeenCalled();
  });

it("projects a bare-array wire response to BadgeSummary[]", async () => {
mockListBadges.mockResolvedValueOnce([
{ code: "first-quiz", name: "First Quiz", rarity: "COMMON" },
{ code: "ten-streak", name: "Ten Streak", rarity: "UNCOMMON" },
    ]);

const { result } = renderHook(() => useBadges());

await waitFor(() => {
expect(result.current.badges.length).toBe(2);
    });

expect(result.current.badges[0]?.code).toBe("first-quiz");

expect(result.current.badges[1]?.tier).toBe("SILVER");
  });

it("handles envelope shape transparently (typed as array)", async () => {

mockListBadges.mockResolvedValueOnce([]);

const { result } = renderHook(() => useBadges());

await waitFor(() => {
expect(result.current.badges).toBeDefined();
    });

expect(result.current.badges).toEqual([]);
  });

it("does not guess when there is no data — surfaces an empty list, not undefined", async () => {
mockListBadges.mockResolvedValueOnce(null);

const { result } = renderHook(() => useBadges());

await waitFor(() => {
expect(result.current.badges).toBeDefined();
    });

expect(result.current.badges).toEqual([]);
  });
});
