/**
 * `useAchievementNotificationRevalidation.spec.tsx` — locks the
 * notification-driven revalidation bridge from TKT-5.5.C2.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * The full socket-event-handler / dedupe / cross-tab broadcast path is
 * exercised by integration tests in a future story (it requires a
 * real `BroadcastChannel` mock + a multi-tab simulation harness). This
 * unit spec deliberately scopes down to the feature-flag precondition
 * contract — the bridge MUST be a no-op when any of the three feature
 * flags is `'placeholder'` so the surface stays consistent with the
 * rest of Story 5.5.
 *
 * Tests cover:
 * - The hook is a no-op (no mutate, no listener registration) when:
 *   - `phase5_achievements === 'placeholder'`.
 *   - `phase5_notifications === 'placeholder'`.
 *   - `phase5_realtime_infrastructure === 'placeholder'`.
 * - When all three flags are `'live'`, the hook only attempts work
 *   once the socket is connected — until then, no SWR mutation is
 *   triggered (the gating is enforced by the event-name parameter to
 *   `useRealtimeEvent`).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useAchievementNotificationRevalidation } from "@/features/achievements/hooks/useAchievementNotificationRevalidation";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseSocket = vi.fn();
vi.mock("@/lib/realtime/useSocket", () => ({
  useSocket: (...args: unknown[]) => mockUseSocket(...args),
}));

const mockUseRealtimeEvent = vi.fn();
vi.mock("@/lib/realtime/useRealtimeEvent", () => ({
  useRealtimeEvent: (...args: unknown[]) => mockUseRealtimeEvent(...args),
}));

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return {
    ...actual,
    // Override the global `mutate` so the bridge's invalidations are
    // observable from tests. The `useSWR` family of hooks keeps their
    // real behaviour. The mock function is exposed via
    // `vi.mocked(swr.mutate)` for inspection.
    mutate: vi.fn().mockResolvedValue(undefined),
  };
});

function setLiveFlags() {
  mockGetFeatureFlagValue.mockImplementation((flag: string) =>
    flag === "phase5_achievements" ||
    flag === "phase5_notifications" ||
    flag === "phase5_realtime_infrastructure"
      ? "live"
      : "",
  );
}

describe("useAchievementNotificationRevalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to "disconnected" socket and "live" flags.
    mockUseSocket.mockReturnValue({
      socket: null,
      connectionState: "disconnected",
    });
    setLiveFlags();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs as a no-op when phase5_achievements === 'placeholder'", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) =>
      flag === "phase5_achievements" ? "placeholder" : "live",
    );

    renderHook(() => useAchievementNotificationRevalidation());

    // The bridge does not subscribe to the socket when its primary
    // surface flag is off — useRealtimeEvent's event-name parameter is
    // null and `enabled` is false. The socket may also be null because
    // useSocket was invoked with autoConnect: false.
    const lastCall = mockUseRealtimeEvent.mock.calls.at(-1);
    expect(lastCall?.[1]).toBeNull();
    expect(lastCall?.[3]).toMatchObject({ enabled: false });
    expect(typeof lastCall?.[2]).toBe("function");
  });

  it("runs as a no-op when phase5_notifications === 'placeholder'", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) =>
      flag === "phase5_notifications" ? "placeholder" : "live",
    );

    renderHook(() => useAchievementNotificationRevalidation());

    const lastCall = mockUseRealtimeEvent.mock.calls.at(-1);
    expect(lastCall?.[1]).toBeNull();
    expect(lastCall?.[3]).toMatchObject({ enabled: false });
  });

  it("runs as a no-op when phase5_realtime_infrastructure === 'placeholder'", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) =>
      flag === "phase5_realtime_infrastructure" ? "placeholder" : "live",
    );

    renderHook(() => useAchievementNotificationRevalidation());

    const lastCall = mockUseRealtimeEvent.mock.calls.at(-1);
    expect(lastCall?.[1]).toBeNull();
    expect(lastCall?.[3]).toMatchObject({ enabled: false });
  });

  it("subscribes to notification:sent when all flags are live AND socket is connected", () => {
    mockUseSocket.mockReturnValue({
      socket: { connected: true },
      connectionState: "connected",
    });

    renderHook(() => useAchievementNotificationRevalidation());

    const lastCall = mockUseRealtimeEvent.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe("notification:sent");
    expect(lastCall?.[3]).toMatchObject({ enabled: true });
  });

  it("does NOT subscribe to notification:sent when socket is disconnected (live flags)", () => {
    mockUseSocket.mockReturnValue({
      socket: { connected: false },
      connectionState: "disconnected",
    });

    renderHook(() => useAchievementNotificationRevalidation());

    const lastCall = mockUseRealtimeEvent.mock.calls.at(-1);
    expect(lastCall?.[1]).toBeNull();
    expect(lastCall?.[3]).toMatchObject({ enabled: false });
  });
});
