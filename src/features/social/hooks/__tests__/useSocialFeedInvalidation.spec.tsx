

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
useSocialFeedInvalidation,
} from "@/features/social/hooks/useSocialFeedInvalidation";
import {
createRealtimeSocialStubSocket,
type RealtimeSocialStubSocket,
} from "@/features/social/realtime/__tests__/realtime-test-harness";

const mutateCalls: Array<{ key: unknown }> = [];

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

vi.mock("@/lib/realtime/cross-tab-invalidation", () => ({
postRelationshipInvalidation: () => undefined,
postFriendRequestInvalidation: () => undefined,
emitPhase5Invalidation: () => undefined,
subscribeToPhase5Invalidation: () => () => undefined,
PHASE5_INVALIDATION_CHANNEL: "phase5/invalidation" as const,
}));

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

function makeFeedItemAddedPayload() {
return {
version: 1,
actorUserId: "11111111-1111-4111-8111-111111111111",
targetUserId: "33333333-3333-4333-8333-333333333333",
correlationId: "corr-feed",
feedItemId: "feed-item-1",
feedItemType: "quiz_completed",
addedAt: "2026-08-07T09:41:00.000Z",
  };
}

function renderWithProviders(
node: React.ReactNode,
options: {
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

let stub: RealtimeSocialStubSocket;

beforeEach(() => {
mutateCalls.length = 0;

stub = createRealtimeSocialStubSocket();
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(stub);
vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);
vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("live");
});

afterEach(() => {
cleanup();
vi.restoreAllMocks();
});

const VIEWER_ID = "viewer-1111-1111-1111-111111111111";

describe("useSocialFeedInvalidation (TKT-6.10.E5)", () => {
it("returns no-op and registers no socket listener when the flag is 'placeholder'", () => {
vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("placeholder");

function Probe() {
useSocialFeedInvalidation(VIEWER_ID);
return null;
    }

renderWithProviders(<Probe />);

expect(socketAdapterModule.createSocket).not.toHaveBeenCalled();
expect(stub.record.onCalls.length).toBe(0);
expect(mutateCalls.length).toBe(0);
  });

it("returns no-op when viewerUserId is null", () => {
function Probe() {
useSocialFeedInvalidation(null);
return null;
    }

renderWithProviders(<Probe />);

expect(socketAdapterModule.createSocket).not.toHaveBeenCalled();
expect(stub.record.onCalls.length).toBe(0);
  });

it("invalidates the feed cache key on every accepted event", async () => {
function Probe() {
useSocialFeedInvalidation(VIEWER_ID);
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = makeFeedItemAddedPayload();
stub._emit("feed.item.added", { event: "feed.item.added", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(1);
    });

expect(flatKey(mutateCalls[0]?.key)).toBe(
`social/v1/feed/${VIEWER_ID}`,
    );
  });

it("drops events whose dedup key is already in the dedup primitive", async () => {
const dedup = makeDedupStub();
const sequenceGuard = makeSequenceStub();

function Probe() {
useSocialFeedInvalidation(VIEWER_ID);
return null;
    }

renderWithProviders(<Probe />, { dedup, sequenceGuard });

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = makeFeedItemAddedPayload();
dedup.add(
`feed.item.added::${payload.actorUserId}::${payload.targetUserId}::${payload.correlationId}`,
    );

stub._emit("feed.item.added", { event: "feed.item.added", data: payload });

await new Promise((r) => setTimeout(r, 0));

expect(mutateCalls.length).toBe(0);
  });

it("drops events whose sequence guard returns 'drop'", async () => {
const dedup = makeDedupStub();
const sequenceGuard = makeSequenceStub();

function Probe() {
useSocialFeedInvalidation(VIEWER_ID);
return null;
    }

renderWithProviders(<Probe />, { dedup, sequenceGuard });

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

sequenceGuard.accept(
`feed.item.added::11111111-1111-4111-8111-111111111111::33333333-3333-4333-8333-333333333333`,
Number.MAX_SAFE_INTEGER,
    );

const payload = makeFeedItemAddedPayload();
stub._emit("feed.item.added", { event: "feed.item.added", data: payload });

await new Promise((r) => setTimeout(r, 0));

expect(mutateCalls.length).toBe(0);
  });

it("removes the socket listener on unmount", async () => {
function Probe() {
useSocialFeedInvalidation(VIEWER_ID);
return null;
    }

const { unmount } = renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
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
        .some((c) => c.event === "feed.item.added"),
    ).toBe(true);
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

const { useSocialFeedInvalidation: reimported } = await import(
"@/features/social/hooks/useSocialFeedInvalidation"
    );

function Probe() {
reimported(VIEWER_ID);
return null;
    }

renderWithProviders(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

stub._emit("feed.item.added", {
event: "feed.item.added",
data: makeFeedItemAddedPayload(),
    });

await new Promise((r) => setTimeout(r, 0));

for (const call of breadcrumbCalls) {
const serialised = JSON.stringify(call);
expect(serialised).not.toMatch(/friendshipId/);
expect(serialised).not.toMatch(/followId/);
    }
  });
});
