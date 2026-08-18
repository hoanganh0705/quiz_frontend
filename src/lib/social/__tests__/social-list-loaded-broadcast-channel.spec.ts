

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockBroadcastChannel {
static instances: MockBroadcastChannel[] = [];
public listeners: Array<(event: MessageEvent) => void> = [];
public posted: unknown[] = [];
public name: string;

constructor(name: string) {
this.name = name;

if (!name.endsWith("-probe")) {
MockBroadcastChannel.instances.push(this);
    }
  }

addEventListener(_type: "message", cb: (event: MessageEvent) => void): void {
this.listeners.push(cb);
  }

removeEventListener(
_type: "message",
cb: (event: MessageEvent) => void,
  ): void {
this.listeners = this.listeners.filter((l) => l !== cb);
  }

postMessage(data: unknown): void {
this.posted.push(data);

for (const listener of this.listeners) {
listener({ data } as MessageEvent);
    }
  }

close(): void {
MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(
(i) => i !== this,
    );
  }
}

beforeEach(() => {
MockBroadcastChannel.instances = [];

vi.resetModules();
vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
});

afterEach(() => {
MockBroadcastChannel.instances = [];
vi.unstubAllGlobals();
});

describe("social-list-loaded-broadcast-channel", () => {
it("uses the documented channel name and creates a single BroadcastChannel", async () => {
const { getSocialListLoadedChannel } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );
const channel = getSocialListLoadedChannel();
expect(channel).not.toBeNull();
expect(channel!.name).toBe("social/list-loaded");
expect(MockBroadcastChannel.instances.length).toBe(1);

const second = getSocialListLoadedChannel();
expect(second).toBe(channel);
expect(MockBroadcastChannel.instances.length).toBe(1);
  });

it("publishSocialListLoaded posts the documented payload shape", async () => {
const { publishSocialListLoaded } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );
const posted = publishSocialListLoaded({
kind: "followers",
targetUserId: "u1",
offset: 20,
limit: 20,
    });
expect(posted).toBe(true);
const channel = MockBroadcastChannel.instances[0]!;
expect(channel.posted.length).toBe(1);
const payload = channel.posted[0] as Record<string, unknown>;
expect(payload.kind).toBe("followers");
expect(payload.targetUserId).toBe("u1");
expect(payload.offset).toBe(20);
expect(payload.limit).toBe(20);
expect(typeof payload.at).toBe("number");
expect(typeof payload.tabId).toBe("string");
  });

it("publishSocialListLoaded accepts the legacy (D3) userId shape and normalises it", async () => {
const { publishSocialListLoaded } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );

const posted = publishSocialListLoaded({
kind: "list.loaded",
userId: "u-legacy",
    } as unknown as { kind: "followers"; userId: string });
expect(posted).toBe(true);
const payload = MockBroadcastChannel.instances[0]!.posted[0] as Record<
string,
unknown
    >;
expect(payload.targetUserId).toBe("u-legacy");
expect(payload.userId).toBe("u-legacy");
expect(payload.offset).toBe(0);
expect(payload.limit).toBe(20);
  });

it("returns false in environments without BroadcastChannel", async () => {
vi.unstubAllGlobals();

vi.resetModules();
const channel = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );
vi.stubGlobal("BroadcastChannel", undefined);
const posted = channel.publishSocialListLoaded({
kind: "followers",
targetUserId: "u1",
offset: 0,
limit: 20,
    });
expect(posted).toBe(false);
  });

it("subscribeSocialListLoaded invokes the handler for cross-tab events", async () => {
const { publishSocialListLoaded, subscribeSocialListLoaded } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );

publishSocialListLoaded({
kind: "followers",
targetUserId: "u1",
offset: 0,
limit: 20,
    });
const handler = vi.fn();
const unsubscribe = subscribeSocialListLoaded(handler);

const other = MockBroadcastChannel.instances[0]!;
other.postMessage({
kind: "followers",
targetUserId: "u2",
offset: 20,
limit: 20,
at: Date.now(),
tabId: "other-tab",
userId: "u2",
    });
expect(handler).toHaveBeenCalledTimes(1);
expect(handler.mock.calls[0]![0].targetUserId).toBe("u2");
unsubscribe();
  });

it("filters out same-tab events", async () => {
const { subscribeSocialListLoaded } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );

const { publishSocialListLoaded } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );
publishSocialListLoaded({
kind: "followers",
targetUserId: "u1",
offset: 0,
limit: 20,
    });
const handler = vi.fn();
subscribeSocialListLoaded(handler);
const channel = MockBroadcastChannel.instances[0]!;

if (typeof sessionStorage !== "undefined") {
const myTabId = sessionStorage.getItem("social:list-loaded:tabId");
channel.postMessage({
kind: "followers",
targetUserId: "u2",
offset: 0,
limit: 20,
at: Date.now(),
tabId: myTabId ?? "ssr",
userId: "u2",
      });
    }
expect(handler).not.toHaveBeenCalled();
  });

it("installSocialListLoadedLogoutReset detaches handlers on auth-state-change (TKT-6.2.G4)", async () => {
const {
installSocialListLoadedLogoutReset,
publishSocialListLoaded,
subscribeSocialListLoaded,
unsubscribeAllSocialListLoadedHandlers,
    } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );
publishSocialListLoaded({
kind: "followers",
targetUserId: "u1",
offset: 0,
limit: 20,
    });
const handler = vi.fn();
subscribeSocialListLoaded(handler);
const cleanup = installSocialListLoadedLogoutReset();

window.dispatchEvent(new Event("auth-state-change"));

const channel = MockBroadcastChannel.instances[0]!;
channel.postMessage({
kind: "followers",
targetUserId: "u9",
offset: 0,
limit: 20,
at: Date.now(),
tabId: "other-tab",
userId: "u9",
    });
expect(handler).not.toHaveBeenCalled();

window.dispatchEvent(new Event("auth-state-change"));
expect(handler).not.toHaveBeenCalled();

const second = installSocialListLoadedLogoutReset();
expect(second).toBe(cleanup);
cleanup();

unsubscribeAllSocialListLoadedHandlers();
  });

it("unsubscribeAllSocialListLoadedHandlers detaches every active handler", async () => {
const {
publishSocialListLoaded,
subscribeSocialListLoaded,
unsubscribeAllSocialListLoadedHandlers,
    } = await import(
"@/lib/social/social-list-loaded-broadcast-channel"
    );
publishSocialListLoaded({
kind: "followers",
targetUserId: "u1",
offset: 0,
limit: 20,
    });
const h1 = vi.fn();
const h2 = vi.fn();
subscribeSocialListLoaded(h1);
subscribeSocialListLoaded(h2);
unsubscribeAllSocialListLoadedHandlers();
const channel = MockBroadcastChannel.instances[0]!;
channel.postMessage({
kind: "followers",
targetUserId: "u9",
offset: 0,
limit: 20,
at: Date.now(),
tabId: "other",
userId: "u9",
    });
expect(h1).not.toHaveBeenCalled();
expect(h2).not.toHaveBeenCalled();
  });

it("does not throw during SSR (module init)", async () => {

vi.stubGlobal("window", undefined);
vi.resetModules();
await expect(
import(
"@/lib/social/social-list-loaded-broadcast-channel"
      ),
    ).resolves.toBeDefined();
  });
});