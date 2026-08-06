/**
 * `social-list-loaded-broadcast-channel.spec.ts` — Locks the
 * TKT-6.2.G1 contract.
 *
 * Asserts:
 *
 *   - The channel name is `'social/list-loaded'`.
 *   - `publishSocialListLoaded` posts the documented payload
 *     shape (kind, targetUserId, offset, limit, at, tabId).
 *   - The channel returns `null` and publisher returns `false` in
 *     environments without `BroadcastChannel`.
 *   - `subscribeSocialListLoaded` invokes the handler for events
 *     on the channel.
 *   - Same-tab events are filtered out (no loop).
 *   - Legacy (D3) `userId` input shape is normalised to
 *     `targetUserId`.
 *   - `unsubscribeAllSocialListLoadedHandlers` detaches every
 *     active handler (TKT-6.2.G4 integration).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  public listeners: Array<(event: MessageEvent) => void> = [];
  public posted: unknown[] = [];
  public name: string;

  constructor(name: string) {
    this.name = name;
    // Availability probes (built internally by the channel
    // helper) use the `-probe` suffix to avoid polluting the
    // production instance list.
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
    // Dispatch to listeners as a real BroadcastChannel does.
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
  // Each test gets a fresh module evaluation to dodge the
  // module-scoped singleton.
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
    // Idempotent — second call returns the same instance.
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
    // The D3 legacy payload shape carries `kind: 'list.loaded'`,
    // which is narrower than the canonical G1 union. The cast keeps
    // the test honest about what the legacy caller supplied.
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
    // Re-initialise the module so the cached availability flag
    // reflects the missing global.
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
    // Trigger first publication to install the channel adapter.
    publishSocialListLoaded({
      kind: "followers",
      targetUserId: "u1",
      offset: 0,
      limit: 20,
    });
    const handler = vi.fn();
    const unsubscribe = subscribeSocialListLoaded(handler);
    // Simulate a cross-tab broadcast.
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
    // Force-install the adapter by triggering a publish.
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
    // Get the current tab id from sessionStorage / module cache.
    // The mock is constructed via `new BroadcastChannel('test')` in
    // the channel's `checkBroadcastChannelAvailable` helper, which
    // doesn't set the tab id; the publisher uses sessionStorage
    // under `social:list-loaded:tabId`.
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
    // Simulate the auth-store logout event.
    window.dispatchEvent(new Event("auth-state-change"));
    // Subsequent publish should not invoke the detached handler.
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
    // Defensive: subsequent dispatch is also a no-op.
    window.dispatchEvent(new Event("auth-state-change"));
    expect(handler).not.toHaveBeenCalled();
    // Idempotent: calling install twice returns the same cleanup.
    const second = installSocialListLoadedLogoutReset();
    expect(second).toBe(cleanup);
    cleanup();
    // After cleanup the registration slot is cleared; re-installing
    // installs a fresh listener.
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
    // Simulate SSR by removing the window reference entirely. The
    // channel module is imported lazily and must not throw.
    vi.stubGlobal("window", undefined);
    vi.resetModules();
    await expect(
      import(
        "@/lib/social/social-list-loaded-broadcast-channel"
      ),
    ).resolves.toBeDefined();
  });
});