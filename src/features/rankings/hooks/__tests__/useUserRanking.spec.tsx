

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useUserRanking } from "@/features/rankings/hooks/useUserRanking";
import { ApiError } from "@/lib/api/core/ApiError";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetUserRanking = vi.fn();
vi.mock(
"@/features/rankings/services/rankings.service",
() => ({
getUserRanking: (...args: unknown[]) => mockGetUserRanking(...args),
  }),
);

describe("useUserRanking", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("returns safe fallback when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(() => useUserRanking("user-1"));

expect(result.current.ranking).toBeNull();
expect(result.current.isLoading).toBe(false);
expect(result.current.isPrivate).toBe(false);
  });

it("does not call service when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useUserRanking("user-1"));

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetUserRanking).not.toHaveBeenCalled();
  });

it("returns safe fallback when userId is null", () => {
const { result } = renderHook(() => useUserRanking(null));

expect(result.current.ranking).toBeNull();
expect(result.current.isLoading).toBe(false);
expect(result.current.isPrivate).toBe(false);
  });

it("does not call service when userId is null", async () => {
renderHook(() => useUserRanking(null));

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetUserRanking).not.toHaveBeenCalled();
  });

it("exposes isPrivate: true when service throws RANKING_FORBIDDEN", async () => {
const forbiddenError = new ApiError({
isAxiosError: true,
name: "ApiError",
message: "Forbidden",
response: {
status: 403,
statusText: "Forbidden",
data: {
status: 403,
title: "Forbidden",
extensions: { code: "RANKING_FORBIDDEN" },
        },
      },
    } as unknown as ConstructorParameters<typeof ApiError>[0]);

mockGetUserRanking.mockRejectedValueOnce(forbiddenError);

const { result } = renderHook(() => useUserRanking("private-user"));

await waitFor(() => {
expect(result.current.isPrivate).toBe(true);
    });

expect(result.current.ranking).toBeNull();
expect(result.current.error).not.toBeNull();
  });

it("exposes isPrivate: true when service throws RANKING_NOT_FOUND", async () => {
const notFoundError = new ApiError({
isAxiosError: true,
name: "ApiError",
message: "Not Found",
response: {
status: 404,
statusText: "Not Found",
data: {
status: 404,
title: "Not Found",
extensions: { code: "RANKING_NOT_FOUND" },
        },
      },
    } as unknown as ConstructorParameters<typeof ApiError>[0]);

mockGetUserRanking.mockRejectedValueOnce(notFoundError);

const { result } = renderHook(() => useUserRanking("ghost-user"));

await waitFor(() => {
expect(result.current.isPrivate).toBe(true);
    });
  });

it("projects a public response to UserRanking", async () => {
mockGetUserRanking.mockResolvedValueOnce({
global: {
allTime: { rank: 10, xp: 9999 },
      },
    });

const { result } = renderHook(() => useUserRanking("user-1"));

await waitFor(() => {
expect(result.current.ranking).not.toBeNull();
    });

expect(result.current.ranking).toMatchObject({
userId: "user-1",
globalRank: 10,
totalScore: 9999,
    });

expect(result.current.isPrivate).toBe(false);
  });
});
