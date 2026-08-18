

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

const mutateCalls: Array<{ key: unknown }> = [];
const breadcrumbCalls: Array<Record<string, unknown>> = [];

vi.mock("@/lib/swr/mutate-carefully", () => ({
mutateCarefully: (key: unknown) => {
mutateCalls.push({ key });
return Promise.resolve();
  },
}));

vi.mock("@/lib/realtime/cross-tab-invalidation", () => ({
postRelationshipInvalidation: () => undefined,
postFriendRequestInvalidation: () => undefined,
emitPhase5Invalidation: () => undefined,
subscribeToPhase5Invalidation: () => () => undefined,
PHASE5_INVALIDATION_CHANNEL: "phase5/invalidation" as const,
}));

vi.mock("@/lib/social/social-realtime-sentry", () => ({
addSocialRealtimeBreadcrumb: () => undefined,
addReconnectReconciliationBreadcrumb: (data: Record<string, unknown>) => {
breadcrumbCalls.push(data);
  },
phase6Social10Breadcrumb: () => undefined,
EPIC_6_10_BREADCRUMB_CATEGORY: "social:6.10" as const,
SOCIAL_EPIC_6_10_VERSION: "1.0.0" as const,
EPIC_6_10_RECONNECT_CATEGORY: "social:6.10:reconnect-reconciliation" as const,
}));

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

function setConnectionState(state: SocketConnectionState): void {
currentState = state;
  // The probe subscribes to the mocked hook, so re-rendering it is
  // enough to drive the effect.
}

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

setConnectionState("connected");
rerender(<Probe />);
vi.advanceTimersByTime(10_000);
expect(breadcrumbCalls.length).toBe(0);

setConnectionState("disconnected");
rerender(<Probe />);

setConnectionState("reconnecting");
rerender(<Probe />);

setConnectionState("connected");
rerender(<Probe />);
vi.advanceTimersByTime(5_000);

expect(breadcrumbCalls.length).toBe(1);

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

const flatKeys = mutateCalls.map((c) => flatKey(c.key));
expect(flatKeys).toContain(`social/v1/relationship/${USER_A}`);
expect(flatKeys).toContain(`social/v1/relationship/${USER_B}`);
expect(flatKeys).toContain(`social/v1/counts/${USER_A}`);
expect(flatKeys).toContain(`social/v1/counts/${USER_B}`);
  });

it("emits a `social:6.10:reconnect-reconciliation` breadcrumb with the documented payload", () => {
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

for (let i = 0; i < 3; i += 1) {
setConnectionState("disconnected");
rerender(<Probe />);
setConnectionState("reconnecting");
rerender(<Probe />);
setConnectionState("connected");
rerender(<Probe />);
vi.advanceTimersByTime(1_000);
    }

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

setConnectionState("disconnected");
rerender(<Probe />);
setConnectionState("reconnecting");
rerender(<Probe />);
setConnectionState("connected");
rerender(<Probe />);
vi.advanceTimersByTime(1_000);

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