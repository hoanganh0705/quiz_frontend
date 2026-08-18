

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