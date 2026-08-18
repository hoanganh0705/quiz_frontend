

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";

import { useAchievementFocusRevalidation } from "@/features/achievements/hooks/useAchievementFocusRevalidation";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockMutate = vi.fn().mockResolvedValue(undefined);
vi.mock("swr", async () => {
const actual = await vi.importActual<typeof import("swr")>("swr");
return {
...actual,
useSWRConfig: () => ({ mutate: mockMutate }),
  };
});

describe("useAchievementFocusRevalidation", () => {
beforeEach(() => {
vi.clearAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("does not install a focus listener when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");
const addSpy = vi.spyOn(window, "addEventListener");

renderHook(() => useAchievementFocusRevalidation());

expect(addSpy).not.toHaveBeenCalledWith("focus", expect.any(Function));
  });

it("does not mutate SWR when flag is placeholder and window fires focus", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useAchievementFocusRevalidation());

act(() => {
window.dispatchEvent(new Event("focus"));
    });

expect(mockMutate).not.toHaveBeenCalled();
  });

it("installs a focus listener when flag is live", () => {
mockGetFeatureFlagValue.mockReturnValue("live");
const addSpy = vi.spyOn(window, "addEventListener");

renderHook(() => useAchievementFocusRevalidation());

expect(addSpy).toHaveBeenCalledWith("focus", expect.any(Function));
  });

it("mutates catalog, my-badges, and history with revalidate on focus", () => {
mockGetFeatureFlagValue.mockReturnValue("live");

renderHook(() => useAchievementFocusRevalidation());

act(() => {
window.dispatchEvent(new Event("focus"));
    });

expect(mockMutate).toHaveBeenCalledWith(
expect.anything(),
undefined,
expect.objectContaining({ revalidate: true }),
    );

const callCount = mockMutate.mock.calls.length;
expect(callCount).toBeGreaterThanOrEqual(3);
  });

it("removes the focus listener on unmount", () => {
mockGetFeatureFlagValue.mockReturnValue("live");
const removeSpy = vi.spyOn(window, "removeEventListener");

const { unmount } = renderHook(() => useAchievementFocusRevalidation());
unmount();

expect(removeSpy).toHaveBeenCalledWith("focus", expect.any(Function));
  });
});
