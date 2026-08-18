

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as socketAdapterModule from "@/lib/realtime/socket-adapter";
import * as authCookiesModule from "@/features/auth/utils/auth-cookies";
import * as featureFlagsModule from "@/lib/feature-flags";

import {
useNotificationEventRouter,
} from "@/features/social/hooks/useNotificationEventRouter";
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

function flatKey(key: unknown): string {
return Array.isArray(key) ? key.join("/") : String(key);
}

function makeNotificationSentPayload(type: string) {
return {
notificationId: `notif-${type}`,
type,
title: `Test ${type}`,
body: "body",
read: false,
createdAt: "2026-08-07T09:41:00.000Z",
data: { kind: type },
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

describe("useNotificationEventRouter (TKT-6.10.E6)", () => {
it("returns no-op and registers no socket listener when the flag is 'placeholder'", () => {
vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("placeholder");

function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

expect(socketAdapterModule.createSocket).not.toHaveBeenCalled();
expect(stub.record.onCalls.length).toBe(0);
expect(mutateCalls.length).toBe(0);
  });

it("registers a listener for `notification:sent` on the `/notifications` namespace", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

expect(
stub.record.onCalls.some((c) => c.event === "notification:sent"),
    ).toBe(true);
  });

it("invalidates the incoming-requests SWR key for `friend_request` kind", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = makeNotificationSentPayload("friend_request");
stub._emit("notification:sent", { event: "notification:sent", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(1);
    });

expect(flatKey(mutateCalls[0]?.key)).toBe("social/v1/requests/incoming");
  });

it("invalidates the unread-count SWR key for `follow` kind", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = makeNotificationSentPayload("follow");
stub._emit("notification:sent", { event: "notification:sent", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(1);
    });

expect(flatKey(mutateCalls[0]?.key)).toBe("notifications/unread-count");
  });

it("invalidates the blocked SWR key for `block` kind", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = makeNotificationSentPayload("block");
stub._emit("notification:sent", { event: "notification:sent", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(1);
    });

expect(flatKey(mutateCalls[0]?.key)).toBe("social/v1/blocked");
  });

it("drops non-social notification kinds silently (no `mutateCarefully`)", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = makeNotificationSentPayload("tournament_start");
stub._emit("notification:sent", { event: "notification:sent", data: payload });

await new Promise((r) => setTimeout(r, 0));

expect(mutateCalls.length).toBe(0);
  });

it("accepts top-level `type` discriminator when `data.kind` is absent", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = {
notificationId: "notif-block",
type: "block",
title: "blocked",
read: false,
createdAt: "2026-08-07T09:41:00.000Z",
    };
stub._emit("notification:sent", { event: "notification:sent", data: payload });

await waitFor(() => {
expect(mutateCalls.length).toBe(1);
    });

expect(flatKey(mutateCalls[0]?.key)).toBe("social/v1/blocked");
  });

it("drops null / undefined / non-object payloads silently", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

stub._emit("notification:sent", { event: "notification:sent", data: null });
stub._emit("notification:sent", {
event: "notification:sent",
data: undefined,
    });
stub._emit("notification:sent", {
event: "notification:sent",
data: "not-an-object",
    });

await new Promise((r) => setTimeout(r, 0));

expect(mutateCalls.length).toBe(0);
  });

it("removes the `notification:sent` listener on unmount", async () => {
function Probe() {
useNotificationEventRouter();
return null;
    }

const { unmount } = render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const initialOnCount = stub.record.onCalls.filter(
(c) => c.event === "notification:sent",
    ).length;
const initialOffCount = stub.record.offCalls.length;

unmount();

const offDelta = stub.record.offCalls.length - initialOffCount;
expect(offDelta).toBeGreaterThanOrEqual(1);
expect(offDelta).toBeLessThanOrEqual(initialOnCount);
expect(
stub.record.offCalls
        .slice(initialOffCount)
        .some((c) => c.event === "notification:sent"),
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

const { useNotificationEventRouter: reimported } = await import(
"@/features/social/hooks/useNotificationEventRouter"
    );

function Probe() {
reimported();
return null;
    }

render(<Probe />);

await waitFor(() => {
expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

const payload = makeNotificationSentPayload("friend_request");
stub._emit("notification:sent", { event: "notification:sent", data: payload });

await new Promise((r) => setTimeout(r, 0));

for (const call of breadcrumbCalls) {
const serialised = JSON.stringify(call);
expect(serialised).not.toMatch(/friendshipId/);
expect(serialised).not.toMatch(/followId/);
    }
  });
});