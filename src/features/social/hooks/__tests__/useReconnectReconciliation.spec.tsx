/**
 * Spec for `useReconnectReconciliation` (TKT-6.10.F2).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.F2.
 *
 * Locks the post-reconnect re-hydration contract:
 *   - First `connected` transition never fires a cycle.
 *   - Subsequent `reconnecting` → `connected` transitions schedule
 *     a debounced cycle.
 *   - Bursts of transitions within the debounce window coalesce.
 *   - The cycle invalidates: incoming + outgoing requests + per-
 *     active-target relationship + social-counts keys.
 *   - The cycle emits a `phase6:6.10:reconnect-reconciliation`
 *     breadcrumb with the documented payload.
 *   - The hook no-ops when the flag is `'placeholder'`.
 *   - The debounce timer is cleared on unmount.
 *   - `friendshipId` / `followId` never appear in any breadcrumb.
 *
 * Implementation note: this spec mocks `useSocket` directly so it can
 * drive `connectionState` in isolation — the hook under test only
 * reads `connectionState`, so coupling the spec to the Phase 5
 * connection-state reducer would conflate concerns.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as useSocketModule from "@/lib/realtime/useSocket";
import * as featureFlagsModule from "@/lib/feature-flags";
import type {
  ConnectionStateContext,
} from "@/lib/realtime/connection-state";
import type { SocketConnectionState } from "@/lib/realtime";

import {
  useReconnectReconciliation,
} from "@/features/social/hooks/useReconnectReconciliation";
import {
  useActiveTargetUserIds,
  __resetActiveTargetUserIdsForTests,
} from "@/features/social/hooks/useActiveTargetUserIds";

// ─── Module-level mocks ──────────────────────────────────────────────────────

const mutateCalls: Array<{ key: unknown }> = [];
const breadcrumbCalls: Array<Record<string, unknown>> = [];

vi.mock("@/lib/swr/mutate-carefully", () => ({
  mutateCarefully: (key: unknown) => {
    mutateCalls.push({ key });
    return Promise.resolve();
  },
}));

vi.mock("@/lib/realtime/phase5-broadcast", () => ({
  postRelationshipInvalidation: () => undefined,
  postFriendRequestInvalidation: () => undefined,
  emitPhase5Invalidation: () => undefined,
  subscribeToPhase5Invalidation: () => () => undefined,
  PHASE5_INVALIDATION_CHANNEL: "phase5/invalidation" as const,
}));

vi.mock("@/lib/social/phase6_6_10_sentry", () => ({
  addSocialRealtimeBreadcrumb: () => undefined,
  addReconnectReconciliationBreadcrumb: (data: Record<string, unknown>) => {
    breadcrumbCalls.push(data);
  },
  phase6Social10Breadcrumb: () => undefined,
  EPIC_6_10_BREADCRUMB_CATEGORY: "phase6:6.10" as const,
  EPIC_6_10_VERSION: "1.0.0" as const,
  EPIC_6_10_RECONNECT_CATEGORY: "phase6:6.10:reconnect-reconciliation" as const,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flatKey(key: unknown): string {
  return Array.isArray(key) ? key.join("/") : String(key);
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

function mockUseSocketReturn(
  state: SocketConnectionState,
): ReturnType<typeof useSocketModule.useSocket> {
  return {
    connectionState: state,
    context: {
      state,
      retryCount: 0,
      lastError: null,
      startedAt: null,
      connectedAt: null,
    } as ConnectionStateContext,
    socket: null,
    error: null,
    reconnect: () => undefined,
    disconnect: () => undefined,
  };
}

// ─── Test setup ──────────────────────────────────────────────────────────────

let currentState: SocketConnectionState = "idle";

beforeEach(() => {
  mutateCalls.length = 0;
  breadcrumbCalls.length = 0;
  __resetActiveTargetUserIdsForTests();
  currentState = "idle";

  vi.spyOn(useSocketModule, "useSocket").mockImplementation(() =>
    mockUseSocketReturn(currentState),
  );
  vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("live");
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * Re-render the probe with a new `connectionState`. Triggers the
 * effect inside `useReconnectReconciliation` so the transition
 * detector runs.
 */
function setConnectionState(state: SocketConnectionState): void {
  currentState = state;
  // The probe subscribes to the mocked hook, so re-rendering it is
  // enough to drive the effect.
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useReconnectReconciliation (TKT-6.10.F2)", () => {
  it("does not fire a cycle on the first `connected` transition", () => {
    function Probe() {
      useReconnectReconciliation();
      return null;
    }

    currentState = "connecting";
    const { rerender } = render(<Probe />);

    setConnectionState("connected");
    rerender(<Probe />);

    vi.advanceTimersByTime(10_000);

    expect(mutateCalls.length).toBe(0);
    expect(breadcrumbCalls.length).toBe(0);
  });

  it("fires a debounced cycle on `reconnecting` → `connected`", () => {
    function Probe() {
      useReconnectReconciliation();
      return null;
    }

    currentState = "connecting";
    const { rerender } = render(<Probe />);

    // First connect: bootstrap (no cycle).
    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(10_000);
    expect(breadcrumbCalls.length).toBe(0);

    // Reconnect cycle: `disconnected` → `reconnecting` → `connected`.
    setConnectionState("disconnected");
    rerender(<Probe />);

    setConnectionState("reconnecting");
    rerender(<Probe />);

    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(5_000);

    expect(breadcrumbCalls.length).toBe(1);

    // Cycle should invalidate at least the two global keys.
    const flatKeys = mutateCalls.map((c) => flatKey(c.key));
    expect(flatKeys).toContain("social/v1/requests/incoming");
    expect(flatKeys).toContain("social/v1/requests/outgoing");
  });

  it("invalidates the per-active-target relationship + counts keys", () => {
    function Probe() {
      useReconnectReconciliation();
      useActiveTargetUserIds(USER_A);
      useActiveTargetUserIds(USER_B);
      return null;
    }

    currentState = "connecting";
    const { rerender } = render(<Probe />);

    // Bootstrap.
    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(10_000);

    // Reconnect.
    setConnectionState("disconnected");
    rerender(<Probe />);
    setConnectionState("reconnecting");
    rerender(<Probe />);
    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(5_000);

    expect(breadcrumbCalls.length).toBe(1);

    const flatKeys = mutateCalls.map((c) => flatKey(c.key));
    expect(flatKeys).toContain(`social/v1/relationship/${USER_A}`);
    expect(flatKeys).toContain(`social/v1/relationship/${USER_B}`);
    expect(flatKeys).toContain(`social/v1/counts/${USER_A}`);
    expect(flatKeys).toContain(`social/v1/counts/${USER_B}`);
  });

  it("emits a `phase6:6.10:reconnect-reconciliation` breadcrumb with the documented payload", () => {
    function Probe() {
      useReconnectReconciliation();
      useActiveTargetUserIds(USER_A);
      return null;
    }

    currentState = "connecting";
    const { rerender } = render(<Probe />);

    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(10_000);

    setConnectionState("disconnected");
    rerender(<Probe />);
    setConnectionState("reconnecting");
    rerender(<Probe />);
    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(5_000);

    expect(breadcrumbCalls.length).toBe(1);

    const call = breadcrumbCalls[0]!;
    expect(call["activeUserIds"]).toEqual([USER_A]);
    expect(Array.isArray(call["invalidationKeys"])).toBe(true);
    expect(typeof call["durationMs"]).toBe("number");
  });

  it("coalesces multiple reconnects within the debounce window into one cycle", () => {
    function Probe() {
      useReconnectReconciliation();
      return null;
    }

    currentState = "connecting";
    const { rerender } = render(<Probe />);

    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(10_000);

    // Three rapid reconnects.
    for (let i = 0; i < 3; i += 1) {
      setConnectionState("disconnected");
      rerender(<Probe />);
      setConnectionState("reconnecting");
      rerender(<Probe />);
      setConnectionState("connected");
      rerender(<Probe />);
      vi.advanceTimersByTime(1_000);
    }
    // Fire the debounce.
    vi.advanceTimersByTime(5_000);

    expect(breadcrumbCalls.length).toBe(1);
  });

  it("no-ops when the feature flag is 'placeholder'", () => {
    vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("placeholder");

    function Probe() {
      useReconnectReconciliation();
      return null;
    }

    render(<Probe />);

    expect(mutateCalls.length).toBe(0);
    expect(breadcrumbCalls.length).toBe(0);
  });

  it("clears the debounce timer on unmount", () => {
    function Probe() {
      useReconnectReconciliation();
      return null;
    }

    currentState = "connecting";
    const { rerender, unmount } = render(<Probe />);

    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(10_000);

    // Schedule a reconnect cycle.
    setConnectionState("disconnected");
    rerender(<Probe />);
    setConnectionState("reconnecting");
    rerender(<Probe />);
    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(1_000);

    // Unmount before the debounce fires.
    unmount();
    vi.advanceTimersByTime(10_000);

    expect(breadcrumbCalls.length).toBe(0);
  });

  it("never includes `friendshipId` or `followId` in any breadcrumb", () => {
    function Probe() {
      useReconnectReconciliation();
      useActiveTargetUserIds(USER_A);
      return null;
    }

    currentState = "connecting";
    const { rerender } = render(<Probe />);

    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(10_000);
    setConnectionState("disconnected");
    rerender(<Probe />);
    setConnectionState("reconnecting");
    rerender(<Probe />);
    setConnectionState("connected");
    rerender(<Probe />);
    vi.advanceTimersByTime(5_000);

    expect(breadcrumbCalls.length).toBe(1);

    for (const call of breadcrumbCalls) {
      const serialised = JSON.stringify(call);
      expect(serialised).not.toMatch(/friendshipId/);
      expect(serialised).not.toMatch(/followId/);
    }
  });
});