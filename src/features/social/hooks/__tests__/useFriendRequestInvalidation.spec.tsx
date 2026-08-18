

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
EventDeduplicatorContext,
type EventDeduplicatorInterface,
} from "@/features/social/realtime/event-deduplicator";
import {
EventSequenceGuardContext,
type EventSequenceGuardInterface,
} from "@/features/social/realtime/event-sequence-guard";

import * as socketAdapterModule from "@/lib/realtime/socket-adapter";
import * as authCookiesModule from "@/features/auth/utils/auth-cookies";
import * as featureFlagsModule from "@/lib/feature-flags";

import {
useFriendRequestInvalidation,
} from "@/features/social/hooks/useFriendRequestInvalidation";
import {
createRealtimeSocialStubSocket,
type RealtimeSocialStubSocket,
} from "@/features/social/realtime/__tests__/realtime-test-harness";

const mutateCalls: Array<{ key: unknown }> = [];
const broadcastCalls: Array<{
decision?: "accept" | "decline" | "cancel";
requesterUserId?: string;
recipientUserId?: string;
}> = [];

vi.mock("@/lib/realtime/ws-error", () => ({
decodeWsError: vi.fn().mockReturnValue({
code: "WS_INTERNAL",
message: "Stub error",
authRequired: false,
retryable: false,
  }),
}));

vi.mock("@/lib/swr/mutate-carefully", () => ({
mutateCarefully: (key: unknown) => {
mutateCalls.push({ key });
return Promise.resolve();
  },
}));

vi.mock("@/lib/realtime/cross-tab-invalidation", async () => {
const actual = await vi.importActual<typeof import("@/lib/realtime/cross-tab-invalidation")>(
"@/lib/realtime/cross-tab-invalidation",
  );
return {
...actual,
postFriendRequestInvalidation: (detail?: {
decision?: "accept" | "decline" | "cancel";
requesterUserId?: string;
recipientUserId?: string;
    }) => {
broadcastCalls.push(detail ?? {});
    },
  };
});

function makeDedupStub(): EventDeduplicatorInterface {
const seen = new Set<string>();
return {
has: (key) => seen.has(key),
add: (key) => {
seen.add(key);
    },
clear: () => seen.clear(),
size: () => seen.size,
  };
}

function makeSequenceStub(): EventSequenceGuardInterface {
const counters = new Map<string, number>();
return {
accept(key, sequence) {
const last = counters.get(key) ?? 0;
if (sequence <= last) return "drop";
counters.set(key, sequence);
return "allow";
    },
clear: () => counters.clear(),
size: () => counters.size,
  };
}

function flatKey(key: unknown): string {
return Array.isArray(key) ? key.join("/") : String(key);
}

function renderWithProviders(
node: React.ReactNode,
options: {
flagValue?: "live" | "placeholder";
dedup?: EventDeduplicatorInterface;
sequenceGuard?: EventSequenceGuardInterface;
  } = {},
) {
const dedup = options.dedup ?? makeDedupStub();
const sequenceGuard = options.sequenceGuard ?? makeSequenceStub();
return {
dedup,
sequenceGuard,
...render(
<EventDeduplicatorContext.Provider value={dedup}>
<EventSequenceGuardContext.Provider value={sequenceGuard}>
{node}
</EventSequenceGuardContext.Provider>
</EventDeduplicatorContext.Provider>,
    ),
  };
}

function makeReceivedPayload() {
return {
version: 1,
actorUserId: "11111111-1111-4111-8111-111111111111",
targetUserId: "22222222-2222-4222-8222-222222222222",
correlationId: "corr-received",
requesterUserId: "11111111-1111-4111-8111-111111111111",
recipientUserId: "22222222-2222-4222-8222-222222222222",
requestedAt: "2026-08-07T09:41:00.000Z",
  };
}

function makeRespondedPayload(decision: "accept" | "decline") {
return {
version: 1,
actorUserId: "22222222-2222-4222-8222-222222222222",
targetUserId: "11111111-1111-4111-8111-111111111111",
correlationId: `corr-responded-${decision}`,
requesterUserId: "11111111-1111-4111-8111-111111111111",
recipientUserId: "22222222-2222-4222-8222-222222222222",
decision,
respondedAt: "2026-08-07T09:41:00.000Z",
  };
}

function makeCancelledPayload() {
return {
version: 1,
actorUserId: "11111111-1111-4111-8111-111111111111",
targetUserId: "22222222-2222-4222-8222-222222222222",
correlationId: "corr-cancelled",
requesterUserId: "11111111-1111-4111-8111-111111111111",
recipientUserId: "22222222-2222-4222-8222-222222222222",
cancelledAt: "2026-08-07T09:41:00.000Z",
  };
}

function makeAddedPayload() {
return {
version: 1,
actorUserId: "22222222-2222-4222-8222-222222222222",
targetUserId: "11111111-1111-4111-8111-111111111111",
correlationId: "corr-added",
mutual: true,
addedAt: "2026-08-07T09:41:00.000Z",
  };
}

function makeRemovedPayload() {
return {
version: 1,
actorUserId: "22222222-2222-4222-8222-222222222222",
targetUserId: "11111111-1111-4111-8111-111111111111",
correlationId: "corr-removed",
mutual: false,
removedAt: "2026-08-07T09:41:00.000Z",
  };
}

let stub: RealtimeSocialStubSocket;

beforeEach(() => {
mutateCalls.length = 0;
broadcastCalls.length = 0;

stub = createRealtimeSocialStubSocket();
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(stub);
vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);
vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("live");
});

afterEach(() => {
cleanup();
vi.restoreAllMocks();
});

const EVENT_NAMES = [
"friend.request.received",
"friend.request.responded",
"friend.request.cancelled",
"friend.added",
"friend.removed",
] as const;

describe("useFriendRequestInvalidation (TKT-6.10.E2)", () => {
it("registers five listeners on mount and removes them on unmount", async () => {
function Probe() {
useFriendRequestInvalidation();
return null;
    }

const { unmount } = renderWithProviders(<Probe />);

await waitFor(() => {
const registered = new Set(stub.record.onCalls.map((c) => c.event));
for (const name of EVENT_NAMES) {
expect(registered.has(name)).toBe(true);
      }
    });

const initialOnCount = stub.record.onCalls.length;
const initialOffCount = stub.record.offCalls.length;

unmount();

const offDelta = stub.record.offCalls.length - initialOffCount;
expect(offDelta).toBeGreaterThanOrEqual(1);
expect(offDelta).toBeLessThanOrEqual(initialOnCount);
expect(
stub.record.offCalls
        .slice(initialOffCount)
        .every((c) => EVENT_NAMES.includes(c.event as (typeof EVENT_NAMES)[number])),
    ).toBe(true);
  });

it("returns no-op and registers no socket listeners when the flag is 'placeholder'", () => {
vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("placeholder");

function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />);

expect(socketAdapterModule.createSocket).not.toHaveBeenCalled();
expect(stub.record.onCalls.length).toBe(0);
expect(mutateCalls.length).toBe(0);
expect(broadcastCalls.length).toBe(0);
  });

it("dispatches the documented key set on friend.request.received", async () => {
function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

const payload = makeReceivedPayload();
stub._emit("friend.request.received", { event: "friend.request.received", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(2);
    });

const keys = mutateCalls.map((c) => flatKey(c.key));
expect(keys).toContain("social/v1/requests/incoming");
expect(keys).toContain("social/v1/counts/22222222-2222-4222-8222-222222222222");
expect(broadcastCalls.length).toBe(1);
  });

it("dispatches the documented key set on friend.request.responded (accept)", async () => {
function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

const payload = makeRespondedPayload("accept");
stub._emit("friend.request.responded", { event: "friend.request.responded", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(3);
    });

const keys = mutateCalls.map((c) => flatKey(c.key));
expect(keys).toContain("social/v1/requests/outgoing");
expect(keys).toContain("social/v1/relationship/22222222-2222-4222-8222-222222222222");
expect(broadcastCalls[0]?.decision).toBe("accept");
  });

it("dispatches the documented key set on friend.request.cancelled", async () => {
function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

const payload = makeCancelledPayload();
stub._emit("friend.request.cancelled", { event: "friend.request.cancelled", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(3);
    });

expect(broadcastCalls[0]?.decision).toBe("cancel");
  });

it("dispatches the documented key set on friend.added", async () => {
function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

const payload = makeAddedPayload();
stub._emit("friend.added", { event: "friend.added", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(4);
    });

const keys = mutateCalls.map((c) => flatKey(c.key));
expect(keys).toContain("social/v1/friends/11111111-1111-4111-8111-111111111111");
expect(keys).toContain("social/v1/relationship/11111111-1111-4111-8111-111111111111");
expect(broadcastCalls[0]?.decision).toBe("accept");
  });

it("dispatches the documented key set on friend.removed", async () => {
function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

const payload = makeRemovedPayload();
stub._emit("friend.removed", { event: "friend.removed", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(4);
    });

const keys = mutateCalls.map((c) => flatKey(c.key));
expect(keys).toContain("social/v1/friends/11111111-1111-4111-8111-111111111111");
  });

it("drops events whose dedup key is already in the dedup primitive", async () => {
const dedup = makeDedupStub();
const sequenceGuard = makeSequenceStub();

function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />, { dedup, sequenceGuard });

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

const payload = makeReceivedPayload();
dedup.add(
`friend.request.received::${payload.actorUserId}::${payload.targetUserId}::${payload.correlationId}`,
    );

stub._emit("friend.request.received", { event: "friend.request.received", data: payload });

await new Promise((r) => setTimeout(r, 0));

expect(mutateCalls.length).toBe(0);
expect(broadcastCalls.length).toBe(0);
  });

it("drops events whose sequence guard returns 'drop'", async () => {
const dedup = makeDedupStub();
const sequenceGuard = makeSequenceStub();

function Probe() {
useFriendRequestInvalidation();
return null;
    }

renderWithProviders(<Probe />, { dedup, sequenceGuard });

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

sequenceGuard.accept(
`friend.request.received::11111111-1111-4111-8111-111111111111::22222222-2222-4222-8222-222222222222`,
Number.MAX_SAFE_INTEGER,
    );

const payload = makeReceivedPayload();
stub._emit("friend.request.received", { event: "friend.request.received", data: payload });

await new Promise((r) => setTimeout(r, 0));

expect(mutateCalls.length).toBe(0);
expect(broadcastCalls.length).toBe(0);
  });

it("never includes `friendshipId` or `followId` in any breadcrumb payload", async () => {
const breadcrumbCalls: Array<Record<string, unknown>> = [];

vi.doMock("@/lib/social/social-realtime-sentry", () => ({
addSocialRealtimeBreadcrumb: (data: Record<string, unknown>) => {
breadcrumbCalls.push(data);
      },
EPIC_6_10_BREADCRUMB_CATEGORY: "social:6.10" as const,
SOCIAL_EPIC_6_10_VERSION: "1.0.0" as const,
EPIC_6_10_RECONNECT_CATEGORY: "social:6.10:reconnect-reconciliation" as const,
addReconnectReconciliationBreadcrumb: () => undefined,
phase6Social10Breadcrumb: () => undefined,
    }));

const { useFriendRequestInvalidation: reimported } = await import(
"@/features/social/hooks/useFriendRequestInvalidation"
    );

function Probe() {
reimported();
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThanOrEqual(EVENT_NAMES.length);
    });

stub._emit("friend.added", { event: "friend.added", data: makeAddedPayload() });

await new Promise((r) => setTimeout(r, 0));

for (const call of breadcrumbCalls) {
const serialised = JSON.stringify(call);
expect(serialised).not.toMatch(/friendshipId/);
expect(serialised).not.toMatch(/followId/);
    }
  });
});
