

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useUserBadges } from "@/features/achievements/hooks/useUserBadges";
import { ApiError } from "@/lib/api/core/ApiError";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetUserBadges = vi.fn();
vi.mock(
"@/features/achievements/services/achievements.service",
() => ({
getUserBadges: (...args: unknown[]) => mockGetUserBadges(...args),
  }),
);

function makeApiError(code: string, status: number) {
return new ApiError({
isAxiosError: true,
name: "ApiError",
message: code,
response: {
status,
statusText: code,
data: {
status,
title: code,
extensions: { code },
      },
    },
  } as unknown as ConstructorParameters<typeof ApiError>[0]);
}

describe("useUserBadges", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("returns safe fallback when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(() => useUserBadges("user-1"));

expect(result.current.profile).toBeNull();
expect(result.current.isLoading).toBe(false);
expect(result.current.isPrivate).toBe(false);
  });

it("does not call getUserBadges when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useUserBadges("user-1"));

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetUserBadges).not.toHaveBeenCalled();
  });

it("returns safe fallback when userId is null", () => {
const { result } = renderHook(() => useUserBadges(null));

expect(result.current.profile).toBeNull();
expect(result.current.isLoading).toBe(false);
expect(result.current.isPrivate).toBe(false);
  });

it("does not call getUserBadges when userId is null", async () => {
renderHook(() => useUserBadges(null));

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetUserBadges).not.toHaveBeenCalled();
  });

it("exposes isPrivate: true on ACHIEVEMENT_FORBIDDEN", async () => {
mockGetUserBadges.mockRejectedValueOnce(
makeApiError("ACHIEVEMENT_FORBIDDEN", 403),
    );

const { result } = renderHook(() => useUserBadges("private-user"));

await waitFor(() => {
expect(result.current.isPrivate).toBe(true);
    });

expect(result.current.profile).toBeNull();
expect(result.current.error).not.toBeNull();
  });

it("does NOT mark errors from other codes as private", async () => {
mockGetUserBadges.mockRejectedValueOnce(
makeApiError("ACHIEVEMENT_NOT_FOUND", 404),
    );

const { result } = renderHook(() => useUserBadges("user-1"));

await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });

expect(result.current.isPrivate).toBe(false);
  });

it("projects a public user badge profile", async () => {
mockGetUserBadges.mockResolvedValueOnce({
userId: "user-1",
totalBadges: 12,
rareBadges: 3,
highestRank: 5,
featuredBadges: [
{ badgeId: "first-quiz", badgeName: "First Quiz", rarity: "COMMON" },
{ badgeId: "ten-streak", badgeName: "Ten Streak", rarity: "RARE" },
      ],
    });

const { result } = renderHook(() => useUserBadges("user-1"));

await waitFor(() => {
expect(result.current.profile).not.toBeNull();
    });

expect(result.current.profile).toMatchObject({
userId: "user-1",
totalBadges: 12,
rareBadges: 3,
highestRank: 5,
    });
expect(result.current.profile?.featuredBadges.length).toBe(2);

expect(result.current.isPrivate).toBe(false);
  });
});
