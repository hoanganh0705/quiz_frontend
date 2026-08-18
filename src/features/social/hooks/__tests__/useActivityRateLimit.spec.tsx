

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useActivityRateLimit } from "@/features/social/hooks/useActivityRateLimit";

const mockUseUserActivity = vi.fn();
vi.mock("@/features/social/hooks/useUserActivity", () => ({
useUserActivity: (...args: unknown[]) => mockUseUserActivity(...args),
}));

beforeEach(() => {
vi.useFakeTimers();
});

afterEach(() => {
vi.useRealTimers();
mockUseUserActivity.mockReset();
});

describe("useActivityRateLimit — rate-limited state", () => {
it("returns rateLimited === true and cooldownSeconds > 0 when rateLimitedUntil is in the future", () => {
const future = Date.now() + 30_000;
mockUseUserActivity.mockReturnValue({
rateLimitedUntil: future,
retry: vi.fn(() => Promise.resolve()),
    });
const { result } = renderHook(() =>
useActivityRateLimit("user-1"),
    );
expect(result.current.rateLimited).toBe(true);
expect(result.current.cooldownSeconds).toBeGreaterThan(0);
expect(result.current.cooldownSeconds).toBeLessThanOrEqual(30);
  });

it("returns rateLimited === false and cooldownSeconds === 0 when rateLimitedUntil is null", () => {
mockUseUserActivity.mockReturnValue({
rateLimitedUntil: null,
retry: vi.fn(() => Promise.resolve()),
    });
const { result } = renderHook(() =>
useActivityRateLimit("user-1"),
    );
expect(result.current.rateLimited).toBe(false);
expect(result.current.cooldownSeconds).toBe(0);
  });

it("returns rateLimited === false and cooldownSeconds === 0 when targetUserId is null", () => {
mockUseUserActivity.mockReturnValue({
rateLimitedUntil: null,
retry: vi.fn(() => Promise.resolve()),
    });
const { result } = renderHook(() =>
useActivityRateLimit(null),
    );
expect(result.current.rateLimited).toBe(false);
expect(result.current.cooldownSeconds).toBe(0);
  });
});

describe("useActivityRateLimit — countdown", () => {
it("ticks down by ~1 every second", () => {
const future = Date.now() + 5_000;
mockUseUserActivity.mockReturnValue({
rateLimitedUntil: future,
retry: vi.fn(() => Promise.resolve()),
    });
const { result } = renderHook(() =>
useActivityRateLimit("user-1"),
    );
const start = result.current.cooldownSeconds;
expect(start).toBeGreaterThan(0);
act(() => {
vi.advanceTimersByTime(1_000);
    });
expect(result.current.cooldownSeconds).toBeLessThanOrEqual(start - 1);
expect(result.current.cooldownSeconds).toBeGreaterThanOrEqual(start - 2);
  });

it("invokes retry() via onCooldownComplete when the countdown reaches zero", () => {
const retry = vi.fn(() => Promise.resolve());
const future = Date.now() + 2_000;
mockUseUserActivity.mockReturnValue({
rateLimitedUntil: future,
retry,
    });
const { result } = renderHook(() =>
useActivityRateLimit("user-1"),
    );
expect(result.current.cooldownSeconds).toBeGreaterThan(0);

act(() => {
vi.advanceTimersByTime(3_000);
    });
expect(result.current.cooldownSeconds).toBe(0);

expect(retry).toHaveBeenCalled();
  });
});

describe("useActivityRateLimit — cleanup", () => {
it("clears the per-second tick on unmount", () => {
const future = Date.now() + 60_000;
const retry = vi.fn(() => Promise.resolve());
mockUseUserActivity.mockReturnValue({
rateLimitedUntil: future,
retry,
    });
const { result, unmount } = renderHook(() =>
useActivityRateLimit("user-1"),
    );
const before = result.current.cooldownSeconds;
unmount();

act(() => {
vi.advanceTimersByTime(2_000);
    });

expect(before).toBeGreaterThan(0);
  });
});
