

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
this.posted.push(data);
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

describe("social-list-loaded-channel (compatibility shim)", () => {
it("creates a BroadcastChannel with the documented name", async () => {
const { getSocialListLoadedChannel } = await import(
"@/features/social/social-list-loaded-channel"
    );
const channel = getSocialListLoadedChannel();
expect(channel).not.toBeNull();
expect(channel!.name).toBe("social/list-loaded");
expect(MockBroadcastChannel.instances.length).toBe(1);
  });

it("publishSocialListLoaded posts the documented (D3) payload shape", async () => {
const { publishSocialListLoaded } = await import(
"@/features/social/social-list-loaded-channel"
    );
const posted = publishSocialListLoaded({
kind: "list.loaded",
userId: "u1",
    });
expect(posted).toBe(true);
const channel = MockBroadcastChannel.instances[0]!;
expect(channel.posted.length).toBe(1);
const payload = channel.posted[0] as Record<string, unknown>;
expect(payload.kind).toBe("list.loaded");
expect(payload.userId).toBe("u1");
expect(payload.targetUserId).toBe("u1");
expect(typeof payload.tabId).toBe("string");
expect(typeof payload.at).toBe("number");
  });

it("re-exports the G1 publisher and lifecycle / subscribe helpers", async () => {
const shim = await import(
"@/features/social/social-list-loaded-channel"
    );
expect(typeof shim.publishSocialListLoaded).toBe("function");
expect(typeof shim.subscribeSocialListLoaded).toBe("function");
expect(typeof shim.unsubscribeAllSocialListLoadedHandlers).toBe(
"function",
    );
expect(shim.SOCIAL_LIST_LOADED_CHANNEL_NAME).toBe("social/list-loaded");
  });
});