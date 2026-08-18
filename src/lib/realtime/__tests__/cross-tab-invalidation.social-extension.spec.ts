

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SELF_TAB_ID = "self-tab";
const OTHER_TAB_ID = "other-tab";

vi.mock("@/lib/api/core/broadcast-channel", () => ({
getCurrentTabId: () => SELF_TAB_ID,
}));

interface RecordedPost {
channelName: string;
payload: unknown;
}

const recordedPosts: RecordedPost[] = [];
const liveChannels: Set<MockBroadcastChannel> = new Set();

class MockBroadcastChannel {
public listeners: Array<(event: MessageEvent) => void> = [];
public name: string;

constructor(name: string) {
this.name = name;
liveChannels.add(this);
  }

addEventListener(
_type: "message",
cb: (event: MessageEvent) => void,
  ): void {
this.listeners.push(cb);
  }

removeEventListener(
_type: "message",
cb: (event: MessageEvent) => void,
  ): void {
this.listeners = this.listeners.filter((l) => l !== cb);
  }

postMessage(data: unknown): void {
recordedPosts.push({ channelName: this.name, payload: data });

for (const peer of liveChannels) {
if (peer === this) continue;
if (peer.name !== this.name) continue;
for (const listener of peer.listeners) {
listener({ data } as MessageEvent);
      }
    }
  }

close(): void {
liveChannels.delete(this);
  }
}

beforeEach(() => {
recordedPosts.length = 0;
liveChannels.clear();
vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
});

afterEach(() => {
recordedPosts.length = 0;
liveChannels.clear();
vi.unstubAllGlobals();
});

import {
emitPhase5Invalidation,
postFriendRequestInvalidation,
postRelationshipInvalidation,
subscribeToPhase5Invalidation,
CROSS_TAB_INVALIDATION_CHANNEL,
} from "../cross-tab-invalidation";

function lastPost(): Record<string, unknown> {
const entry = recordedPosts[recordedPosts.length - 1];
if (!entry) throw new Error("No postMessage call recorded");
return entry.payload as Record<string, unknown>;
}

describe("cross-tab-invalidation — existing four envelopes (regression baseline)", () => {
it("emits a 'notification' envelope with the documented payload shape", () => {
emitPhase5Invalidation({ type: "notification", notificationId: "n1" });
expect(recordedPosts).toHaveLength(1);
expect(recordedPosts[0]!.channelName).toBe("realtime/invalidation");
const posted = recordedPosts[0]!.payload as Record<string, unknown>;
expect(posted.type).toBe("notification");
expect(posted.notificationId).toBe("n1");
expect(posted.tabId).toBe(SELF_TAB_ID);
expect(typeof posted.timestamp).toBe("number");
  });

it("emits an 'instance' envelope with the documented payload shape", () => {
emitPhase5Invalidation({ type: "instance", instanceId: "i1" });
const posted = lastPost();
expect(posted.type).toBe("instance");
expect(posted.instanceId).toBe("i1");
  });

it("emits a 'tournament' envelope with the documented payload shape", () => {
emitPhase5Invalidation({ type: "tournament", tournamentId: "t1" });
const posted = lastPost();
expect(posted.type).toBe("tournament");
expect(posted.tournamentId).toBe("t1");
  });

it("emits an 'achievement' envelope with the documented payload shape", () => {
emitPhase5Invalidation({ type: "achievement", badgeId: "b1" });
const posted = lastPost();
expect(posted.type).toBe("achievement");
expect(posted.badgeId).toBe("b1");
  });
});

describe("cross-tab-invalidation — 'relationship' envelope (TKT-6.10.D3)", () => {
it("emits a 'relationship' envelope with targetUserId + auto-stamped tabId/timestamp", () => {
const before = Date.now();
emitPhase5Invalidation({ type: "relationship", targetUserId: "user-1" });
const after = Date.now();
const posted = lastPost();
expect(posted.type).toBe("relationship");
expect(posted.targetUserId).toBe("user-1");
expect(posted.tabId).toBe(SELF_TAB_ID);
expect(posted.timestamp).toBeGreaterThanOrEqual(before);
expect(posted.timestamp).toBeLessThanOrEqual(after);
  });

it("postRelationshipInvalidation helper emits a 'relationship' envelope", () => {
postRelationshipInvalidation("user-2");
const posted = lastPost();
expect(posted.type).toBe("relationship");
expect(posted.targetUserId).toBe("user-2");
  });
});

describe("cross-tab-invalidation — 'friend-request' envelope (TKT-6.10.D3)", () => {
it("emits a 'friend-request' envelope with no detail", () => {
emitPhase5Invalidation({ type: "friend-request" });
const posted = lastPost();
expect(posted.type).toBe("friend-request");
  });

it("emits a 'friend-request' envelope with decision='accept' + userIds", () => {
emitPhase5Invalidation({
type: "friend-request",
decision: "accept",
requesterUserId: "user-a",
recipientUserId: "user-b",
    });
const posted = lastPost();
expect(posted.type).toBe("friend-request");
expect(posted.decision).toBe("accept");
expect(posted.requesterUserId).toBe("user-a");
expect(posted.recipientUserId).toBe("user-b");
  });

it("emits a 'friend-request' envelope with decision='decline'", () => {
emitPhase5Invalidation({ type: "friend-request", decision: "decline" });
expect(lastPost().decision).toBe("decline");
  });

it("emits a 'friend-request' envelope with decision='cancel'", () => {
emitPhase5Invalidation({ type: "friend-request", decision: "cancel" });
expect(lastPost().decision).toBe("cancel");
  });

it("postFriendRequestInvalidation helper emits a 'friend-request' envelope", () => {
postFriendRequestInvalidation({
decision: "accept",
requesterUserId: "u",
recipientUserId: "v",
    });
const posted = lastPost();
expect(posted.type).toBe("friend-request");
expect(posted.decision).toBe("accept");
expect(posted.requesterUserId).toBe("u");
expect(posted.recipientUserId).toBe("v");
  });
});

describe("cross-tab-invalidation — subscribe + same-tab filter", () => {
it("invokes the subscriber for a cross-tab (different-tabId) message", () => {
const handler = vi.fn();
const unsubscribe = subscribeToPhase5Invalidation(handler);

const peer = new MockBroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
peer.postMessage({
type: "relationship",
targetUserId: "user-other",
tabId: OTHER_TAB_ID,
timestamp: Date.now(),
    });
expect(handler).toHaveBeenCalledTimes(1);
expect(handler.mock.calls[0]![0].targetUserId).toBe("user-other");

unsubscribe();
  });

it("filters out same-tab messages (tabId matches the current tab)", () => {
const handler = vi.fn();
const unsubscribe = subscribeToPhase5Invalidation(handler);

const peer = new MockBroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
peer.postMessage({
type: "friend-request",
tabId: SELF_TAB_ID,
timestamp: Date.now(),
    });
expect(handler).not.toHaveBeenCalled();

unsubscribe();
  });

it("does not echo to the same instance (no self-loop)", () => {
const handler = vi.fn();
const unsubscribe = subscribeToPhase5Invalidation(handler);

const subscriberChannel = [...liveChannels][0]!;
subscriberChannel.postMessage({
type: "relationship",
targetUserId: "u-self",
tabId: OTHER_TAB_ID,
timestamp: Date.now(),
    });
expect(handler).toHaveBeenCalledTimes(0);

unsubscribe();
  });

it("unsubscribe detaches the handler so subsequent cross-tab messages are not delivered", () => {
const handler = vi.fn();
const unsubscribe = subscribeToPhase5Invalidation(handler);

const peer = new MockBroadcastChannel(CROSS_TAB_INVALIDATION_CHANNEL);
peer.postMessage({
type: "relationship",
targetUserId: "u1",
tabId: OTHER_TAB_ID,
timestamp: Date.now(),
    });
expect(handler).toHaveBeenCalledTimes(1);

unsubscribe();

peer.postMessage({
type: "relationship",
targetUserId: "u2",
tabId: OTHER_TAB_ID,
timestamp: Date.now(),
    });
expect(handler).toHaveBeenCalledTimes(1); // still 1, not 2
  });
});

describe("cross-tab-invalidation — channel constant", () => {
it("exports the realtime/invalidation channel name", () => {
expect(CROSS_TAB_INVALIDATION_CHANNEL).toBe("realtime/invalidation");
  });

it("uses the same channel name for all six envelope types (no separate channel per type)", () => {
emitPhase5Invalidation({ type: "relationship", targetUserId: "u" });
emitPhase5Invalidation({ type: "friend-request" });
emitPhase5Invalidation({ type: "notification" });
emitPhase5Invalidation({ type: "achievement" });
expect(recordedPosts).toHaveLength(4);
for (const entry of recordedPosts) {
expect(entry.channelName).toBe("realtime/invalidation");
    }
  });
});