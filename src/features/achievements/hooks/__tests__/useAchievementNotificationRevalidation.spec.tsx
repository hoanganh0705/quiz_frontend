

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

mutate: vi.fn().mockResolvedValue(undefined),
  };
});

function setLiveFlags() {
mockGetFeatureFlagValue.mockImplementation((flag: string) =>
flag === "achievements_live" ||
flag === "notifications_live" ||
flag === "realtime_infrastructure_live"
? "live"
: "",
  );
}

describe("useAchievementNotificationRevalidation", () => {
beforeEach(() => {
vi.clearAllMocks();

mockUseSocket.mockReturnValue({
socket: null,
connectionState: "disconnected",
    });
setLiveFlags();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("runs as a no-op when achievements_live === 'placeholder'", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) =>
flag === "achievements_live" ? "placeholder" : "live",
    );

renderHook(() => useAchievementNotificationRevalidation());

const lastCall = mockUseRealtimeEvent.mock.calls.at(-1);
expect(lastCall?.[1]).toBeNull();
expect(lastCall?.[3]).toMatchObject({ enabled: false });
expect(typeof lastCall?.[2]).toBe("function");
  });

it("runs as a no-op when notifications_live === 'placeholder'", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) =>
flag === "notifications_live" ? "placeholder" : "live",
    );

renderHook(() => useAchievementNotificationRevalidation());

const lastCall = mockUseRealtimeEvent.mock.calls.at(-1);
expect(lastCall?.[1]).toBeNull();
expect(lastCall?.[3]).toMatchObject({ enabled: false });
  });

it("runs as a no-op when realtime_infrastructure_live === 'placeholder'", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) =>
flag === "realtime_infrastructure_live" ? "placeholder" : "live",
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
