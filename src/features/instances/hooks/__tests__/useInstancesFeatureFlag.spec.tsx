/**
 * `useInstancesFeatureFlag.spec.tsx` — locks the feature-flag check hook.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G1.
 *
 * Tests cover:
 * - returns isPlaceholder=true when phase5_instances === 'placeholder'
 * - returns isPlaceholder=false when phase5_instances === 'live'
 * - flagValue reflects the underlying flag value
 * - isLive is true when value is 'live'
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

import { useInstancesFeatureFlag } from "@/features/instances/hooks/useInstancesFeatureFlag";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

describe("useInstancesFeatureFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("returns isPlaceholder=true when flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

    const { result } = renderHook(() => useInstancesFeatureFlag());

    expect(result.current.isPlaceholder).toBe(true);
    expect(result.current.isLive).toBe(false);
    expect(result.current.flagValue).toBe("placeholder");
  });

  it("returns isPlaceholder=false and isLive=true when flag is live", () => {
    mockGetFeatureFlagValue.mockReturnValueOnce("live");

    const { result } = renderHook(() => useInstancesFeatureFlag());

    expect(result.current.isPlaceholder).toBe(false);
    expect(result.current.isLive).toBe(true);
    expect(result.current.flagValue).toBe("live");
  });

  it("forwards the flag value verbatim", () => {
    mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

    const { result } = renderHook(() => useInstancesFeatureFlag());
    expect(result.current.flagValue).toBe("placeholder");
  });

  it("always returns a defined flagValue", () => {
    mockGetFeatureFlagValue.mockReturnValueOnce("live");

    const { result } = renderHook(() => useInstancesFeatureFlag());
    expect(result.current.flagValue).toBeDefined();
    expect(["live", "placeholder"]).toContain(result.current.flagValue);
  });
});