

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useBadge } from "@/features/achievements/hooks/useBadge";
import { ApiError } from "@/lib/api/core/ApiError";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetBadgeByCode = vi.fn();
vi.mock(
"@/features/achievements/services/achievements.service",
() => ({
getBadgeByCode: (...args: unknown[]) => mockGetBadgeByCode(...args),
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

describe("useBadge", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("returns safe fallback when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(() => useBadge("first-quiz"));

expect(result.current.badge).toBeNull();
expect(result.current.isLoading).toBe(false);
expect(result.current.isPrivate).toBe(false);
  });

it("does not call getBadgeByCode when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useBadge("first-quiz"));

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetBadgeByCode).not.toHaveBeenCalled();
  });

it("returns safe fallback when code is null", () => {
const { result } = renderHook(() => useBadge(null));

expect(result.current.badge).toBeNull();
expect(result.current.isLoading).toBe(false);
expect(result.current.isPrivate).toBe(false);
  });

it("does not call getBadgeByCode when code is null", async () => {
renderHook(() => useBadge(null));

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetBadgeByCode).not.toHaveBeenCalled();
  });

it("exposes isPrivate: true on BADGE_HIDDEN (tombstone branch)", async () => {
mockGetBadgeByCode.mockRejectedValueOnce(makeApiError("BADGE_HIDDEN", 410));

const { result } = renderHook(() => useBadge("hidden-badge"));

await waitFor(() => {
expect(result.current.isPrivate).toBe(true);
    });

expect(result.current.badge).toBeNull();
  });

it("does NOT mark deferred badges as private (UI must not claim deferred as earned)", async () => {
mockGetBadgeByCode.mockRejectedValueOnce(makeApiError("BADGE_DEFERRED", 409));

const { result } = renderHook(() => useBadge("deferred-badge"));

await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });

expect(result.current.isPrivate).toBe(false);
  });

it("exposes isPrivate: false on BADGE_NOT_FOUND", async () => {
mockGetBadgeByCode.mockRejectedValueOnce(makeApiError("BADGE_NOT_FOUND", 404));

const { result } = renderHook(() => useBadge("ghost-badge"));

await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });

expect(result.current.isPrivate).toBe(false);
  });

it("projects a normal badge detail", async () => {
mockGetBadgeByCode.mockResolvedValueOnce({
id: "first-quiz",
name: "First Quiz",
description: "Earned by completing the first quiz.",
rarity: "COMMON",
earnedCount: 12345,
    });

const { result } = renderHook(() => useBadge("first-quiz"));

await waitFor(() => {
expect(result.current.badge).not.toBeNull();
    });

expect(result.current.badge?.code).toBe("first-quiz");
expect(result.current.badge?.tier).toBe("BRONZE");
  });
});
