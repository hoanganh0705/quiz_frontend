/**
 * `useAchievementFocusRevalidation.spec.tsx` — locks the focus-driven
 * revalidation bridge from TKT-5.5.F2.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * Tests cover:
 * - The hook is a no-op when `phase5_achievements === 'placeholder'`
 *   (no window listener, no SWR mutate).
 * - On `focus` event, mutates the catalog, my-badges, and history
 *   SWR keys with revalidate: true.
 */

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

    // Manually dispatch the focus event to verify the hook is no-op.
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

    // Three keys are invalidated.
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
