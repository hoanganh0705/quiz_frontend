/**
 * `useInstanceRealtimeBridge.spec.tsx` — locks the realtime bridge hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.G2.
 *
 * Tests cover:
 * - feature flag gating (placeholder disables the bridge)
 * - events from `useInstanceSocket` are dispatched to the per-instance
 *   store via the correct store action
 * - lifecycle events trigger SWR invalidation and cross-tab broadcast
 * - player_joined/player_left update the per-instance entry
 * - events for a different instanceId are dropped
 * - unmount / instanceId change clears the realtime entry
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useInstanceRealtimeBridge } from "@/features/instances/hooks/useInstanceRealtimeBridge";
import {
  useInstanceRealtimeStore,
  selectInstanceRealtimeEntry,
  selectInstanceRealtimePlayers,
  selectInstanceRealtimeStatus,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import type { InstanceSocketEvent } from "@/features/instances/types/instance.types";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

let subscribeHandler: ((event: InstanceSocketEvent) => void) | null = null;

const mockUseInstanceSocket = vi.fn();
vi.mock("@/features/instances/hooks/useInstanceSocket", () => ({
  useInstanceSocket: (...args: unknown[]) => mockUseInstanceSocket(...args),
}));

const mockEmitPhase5Invalidation = vi.fn();
vi.mock("@/lib/realtime", async () => {
  const actual = await vi.importActual<typeof import("@/lib/realtime")>(
    "@/lib/realtime",
  );
  return {
    ...actual,
    emitPhase5Invalidation: (...args: unknown[]) =>
      mockEmitPhase5Invalidation(...args),
  };
});

const mockGlobalMutate = vi.fn();
vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return {
    ...actual,
    mutate: (...args: unknown[]) => mockGlobalMutate(...args),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function setFeatureFlags(
  instancesFlag: "live" | "placeholder",
  realtimeFlag: "live" | "placeholder",
) {
  mockGetFeatureFlagValue.mockImplementation((key: string) => {
    if (key === "phase5_instances") return instancesFlag;
    if (key === "phase5_realtime_infrastructure") return realtimeFlag;
    return "placeholder";
  });
}

function setAuthState(isAuthenticated: boolean) {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: isAuthenticated ? "authenticated" : "unauthenticated",
    isAuthenticated,
    isBootstrapping: false,
    isDegraded: false,
    currentUser: null,
    user: null,
    error: null,
    profileError: null,
    refetch: vi.fn(),
    clearBootstrap: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribeHandler = null;
  useInstanceRealtimeStore.getState().resetAll();
  setFeatureFlags("live", "live");
  setAuthState(true);
  mockUseInstanceSocket.mockImplementation(() => ({
    connectionState: "connected",
    lastError: null,
    subscribe: (handler: (event: InstanceSocketEvent) => void) => {
      subscribeHandler = handler;
      return () => {
        if (subscribeHandler === handler) subscribeHandler = null;
      };
    },
    emitJoin: vi.fn(),
    emitLeave: vi.fn(),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────

function makePlayerJoinEvent(
  overrides: Partial<{
    instanceId: string;
    eventSequence: number;
    userId: string;
    displayName: string;
    at: string;
  }> = {},
): InstanceSocketEvent {
  return {
    type: "player_joined",
    instanceId: overrides.instanceId ?? "inst-1",
    at: overrides.at ?? "2026-01-01T00:00:00Z",
    eventSequence: overrides.eventSequence ?? 1,
    player: {
      id: overrides.userId ?? "u-1",
      userId: overrides.userId ?? "u-1",
      displayName: overrides.displayName ?? "Alice",
      isCurrentUser: false,
      isHost: false,
    } as never,
  };
}

describe("useInstanceRealtimeBridge", () => {
  describe("feature flag gating", () => {
    it("does not subscribe when phase5_instances flag is placeholder", () => {
      setFeatureFlags("placeholder", "live");

      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      expect(subscribeHandler).toBeNull();
    });

    it("does not subscribe when phase5_realtime_infrastructure flag is placeholder", () => {
      setFeatureFlags("live", "placeholder");

      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      expect(subscribeHandler).toBeNull();
    });

    it("does not subscribe when instanceId is null", () => {
      renderHook(() => useInstanceRealtimeBridge(null));

      expect(subscribeHandler).toBeNull();
    });
  });

  describe("event dispatch", () => {
    it("applies player_joined to the store entry", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ userId: "u-1" }));
      });

      const entry = selectInstanceRealtimeEntry(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(entry).not.toBeNull();
      const players = selectInstanceRealtimePlayers(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(players?.["u-1"]).toBeDefined();
    });

    it("applies player_left and removes the player from the entry", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ userId: "u-1", eventSequence: 1 }));
      });
      act(() => {
        subscribeHandler?.({
          type: "player_left",
          instanceId: "inst-1",
          playerId: "u-1",
          at: "2026-01-01T00:00:01Z",
          eventSequence: 2,
        });
      });

      const players = selectInstanceRealtimePlayers(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(players?.["u-1"]).toBeUndefined();
    });

    it("applies instance_started lifecycle event to the store entry", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.({
          type: "instance_started",
          instanceId: "inst-1",
          at: "2026-01-01T00:00:00Z",
          eventSequence: 1,
          status: "running",
        } as never);
      });

      const status = selectInstanceRealtimeStatus(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(status).toBe("running");
    });

    it("applies instance_closed lifecycle event and records closedAt", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.({
          type: "instance_closed",
          instanceId: "inst-1",
          at: "2026-01-01T00:00:00Z",
          eventSequence: 1,
          status: "closed",
        } as never);
      });

      const entry = selectInstanceRealtimeEntry(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(entry?.instanceStatus).toBe("closed");
      expect(entry?.closedAt).toBe("2026-01-01T00:00:00Z");
    });

    it("applies instance_cancelled lifecycle event and records closedAt", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.({
          type: "instance_cancelled",
          instanceId: "inst-1",
          at: "2026-01-01T00:00:00Z",
          eventSequence: 1,
          status: "cancelled",
        } as never);
      });

      const entry = selectInstanceRealtimeEntry(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(entry?.instanceStatus).toBe("cancelled");
      expect(entry?.closedAt).toBe("2026-01-01T00:00:00Z");
    });

    it("applies countdown_started event without changing closedAt", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.({
          type: "countdown_started",
          instanceId: "inst-1",
          at: "2026-01-01T00:00:00Z",
          eventSequence: 1,
        } as never);
      });

      const entry = selectInstanceRealtimeEntry(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(entry?.lastEventSequence).toBe(1);
      expect(entry?.closedAt).toBeNull();
    });

    it("applies countdown_cancelled event without changing closedAt", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.({
          type: "countdown_cancelled",
          instanceId: "inst-1",
          at: "2026-01-01T00:00:00Z",
          eventSequence: 1,
        } as never);
      });

      const entry = selectInstanceRealtimeEntry(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(entry?.lastEventSequence).toBe(1);
      expect(entry?.closedAt).toBeNull();
    });

    it("drops events for a different instanceId", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ instanceId: "inst-2", userId: "u-9" }));
      });

      const players = selectInstanceRealtimePlayers(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(players?.["u-9"]).toBeUndefined();
    });

    it("drops stale events with eventSequence <= lastEventSequence", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ userId: "u-1", eventSequence: 5 }));
      });
      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ userId: "u-2", eventSequence: 3 }));
      });

      const players = selectInstanceRealtimePlayers(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      expect(players?.["u-1"]).toBeDefined();
      expect(players?.["u-2"]).toBeUndefined();
    });
  });

  describe("invalidation side-effects", () => {
    it("invokes globalMutate for the detail key on lifecycle events", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.({
          type: "instance_started",
          instanceId: "inst-1",
          at: "2026-01-01T00:00:00Z",
          eventSequence: 1,
          status: "running",
        } as never);
      });

      expect(mockGlobalMutate).toHaveBeenCalled();
    });

    it("broadcasts phase5 invalidation on lifecycle events", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.({
          type: "instance_started",
          instanceId: "inst-1",
          at: "2026-01-01T00:00:00Z",
          eventSequence: 1,
          status: "running",
        } as never);
      });

      expect(mockEmitPhase5Invalidation).toHaveBeenCalledWith({
        type: "instance",
      });
    });

    it("does not invalidate or broadcast on player_joined", () => {
      renderHook(() => useInstanceRealtimeBridge("inst-1"));

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ userId: "u-1" }));
      });

      expect(mockGlobalMutate).not.toHaveBeenCalled();
      expect(mockEmitPhase5Invalidation).not.toHaveBeenCalled();
    });
  });

  describe("unmount cleanup", () => {
    it("resets the realtime entry on unmount", () => {
      const { unmount } = renderHook(() =>
        useInstanceRealtimeBridge("inst-1"),
      );

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ userId: "u-1" }));
      });

      expect(
        selectInstanceRealtimeEntry(
          useInstanceRealtimeStore.getState(),
          "inst-1",
        ),
      ).not.toBeNull();

      unmount();

      expect(
        selectInstanceRealtimeEntry(
          useInstanceRealtimeStore.getState(),
          "inst-1",
        ),
      ).toBeNull();
    });

    it("isolates entries between two different instanceIds", () => {
      const { rerender } = renderHook(
        ({ id }: { id: string | null }) => useInstanceRealtimeBridge(id),
        { initialProps: { id: "inst-1" as string | null } },
      );

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ instanceId: "inst-1", userId: "u-1" }));
      });

      rerender({ id: "inst-2" });

      act(() => {
        subscribeHandler?.(makePlayerJoinEvent({ instanceId: "inst-2", userId: "u-2" }));
      });

      const inst1Players = selectInstanceRealtimePlayers(
        useInstanceRealtimeStore.getState(),
        "inst-1",
      );
      const inst2Players = selectInstanceRealtimePlayers(
        useInstanceRealtimeStore.getState(),
        "inst-2",
      );

      // inst-1 is reset on unmount via the cleanup effect that fires
      // when the bridge re-mounts with a different instanceId.
      expect(inst2Players?.["u-2"]).toBeDefined();
      expect(inst1Players?.["u-1"]).toBeUndefined();
    });
  });
});
