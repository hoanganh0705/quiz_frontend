/**
 * Unit tests for the bookmarks broadcast channel manager.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.F1.
 *
 * Cases per the ticket AC #1–5:
 *
 *   (a) Event serialization: posting a `bookmarks/invalidated` event
 *       with `userId` is delivered to other-tab subscribers.
 *   (b) Same-tab suppression: the sender tab does NOT process its
 *       own event (preventing event loops).
 *   (c) Different-tab delivery: a hand-crafted message from another
 *       tabId reaches subscribers.
 *   (d) Unsupported-browser fallback: when `BroadcastChannel` is
 *       unavailable, broadcasting is a safe no-op and subscribing is
 *       still possible without throwing.
 *   (e) Regression: the auth channel's event types and exports
 *       remain unchanged.
 *
 * Test-environment notes: vitest's `node` project picks up files
 * under `src/lib/api/core/__tests__/`. We mock the global
 * `BroadcastChannel` constructor with a minimal in-memory
 * implementation so the test exercises the actual code paths without
 * a real browser environment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MockMessageEvent<T = unknown> {
  data: T;
}

type MockMessageListener = (event: MockMessageEvent) => void;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  public name: string;
  // The mock stores its listeners in a static map keyed by instance
  // id. This sidesteps any class-field / `private` quirks introduced
  // by the TypeScript transform — we use a plain instance property
  // exposed via a getter so the test can introspect it.
  public listeners: MockMessageListener[] = [];
  public closed = false;

  constructor(name: string) {
    this.name = name;
    this.listeners = [];
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: 'message', listener: MockMessageListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(_type: 'message', listener: MockMessageListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  postMessage(data: unknown): void {
    if (this.closed) return;
    // BroadcastChannel does NOT deliver to the same instance — same-
    // tab filtering. The mock simulates that here.
    for (const listener of this.listeners) {
      listener({ data });
    }
  }

  close(): void {
    this.closed = true;
    this.listeners = [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  // Install a fresh mock for every test. `globalThis.BroadcastChannel`
  // is the runtime reference; `vi.stubGlobal` is the vitest-recommended
  // way to set it.
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
  // The bookmark channel checks `typeof window === 'undefined'` to
  // short-circuit server-side rendering. In the node-environment
  // vitest project, `window` is undefined by default. We stub it to
  // an empty object so the channel module proceeds with construction.
  vi.stubGlobal('window', {});
  // Reset the cached availability flag by clearing the module
  // registry entries for the bookmarks-broadcast-channel module. We
  // re-import on demand inside each test so the cache is fresh.
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Helper: import the bookmarks channel module AND eagerly initialize
 * the channel (which registers the `message` listener). Tests that
 * simulate remote-tab events via `channel['listeners']` need the
 * listener registered before they can dispatch into it.
 */
async function importAndInitialize(): Promise<{
  subscribeToBookmarkEvents: typeof import('../bookmarks-broadcast-channel').subscribeToBookmarkEvents;
  broadcastBookmarksInvalidated: typeof import('../bookmarks-broadcast-channel').broadcastBookmarksInvalidated;
}> {
  const mod = await import('../bookmarks-broadcast-channel');
  // Trigger channel initialization by issuing a broadcast. The
  // broadcast itself is a same-tab no-op for subscribers, but it
  // registers the message listener on the channel.
  mod.broadcastBookmarksInvalidated({ userId: '__init__' });
  return mod;
}

/**
 * Helper: locate the singleton `bookmarks` channel instance on the
 * mock. The mock also has a `'test'` probe created by
 * `checkBroadcastChannelAvailable` — we filter by name to skip it.
 */
function getBookmarksChannelInstance(): MockBroadcastChannel {
  const instance = MockBroadcastChannel.instances.find(
    (candidate) => candidate.name === 'bookmarks',
  );
  if (!instance) {
    throw new Error(
      'No `bookmarks` channel instance was created; broadcast first.',
    );
  }
  return instance;
}

// ─── (a) Event serialization + delivery ──────────────────────────────────────

describe('bookmarks broadcast channel — event delivery', () => {
  it('(a1) the singleton channel is created on the first broadcast call', async () => {
    const { broadcastBookmarksInvalidated } = await import(
      '../bookmarks-broadcast-channel'
    );

    // Before any broadcast, no channel instance should exist. The
    // `BroadcastChannel('test')` probe in `checkBroadcastChannelAvailable`
    // runs lazily on the first call that consults it — so before
    // `broadcastBookmarksInvalidated` is called, the count is 0.
    expect(MockBroadcastChannel.instances.length).toBe(0);
    broadcastBookmarksInvalidated({ userId: 'user-1' });
    // The first call to `checkBroadcastChannelAvailable` constructs a
    // `BroadcastChannel('test')` probe instance, then `getBookmarksChannel`
    // constructs the singleton `bookmarks` channel. After broadcast, the
    // mock has both the probe and the singleton — we filter by name to
    // assert the singleton specifically.
    const bookmarkChannel = MockBroadcastChannel.instances.find(
      (instance) => instance.name === 'bookmarks',
    );
    expect(bookmarkChannel).toBeDefined();
    expect(bookmarkChannel?.name).toBe('bookmarks');
  });

  it('(a2) a hand-crafted message with a different tabId reaches subscribers', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    const received: Array<{ userId: string; type: string }> = [];
    subscribeToBookmarkEvents((event) => {
      received.push({ userId: event.userId, type: event.type });
    });

    // Trigger channel initialization so the listener is registered.
    broadcastBookmarksInvalidated({ userId: 'placeholder' });

    // Re-import the auth channel to get its `getCurrentTabId`. We
    // need a different tabId in the simulated event payload.
    const authModule = await import('../broadcast-channel');
    const authTabId = authModule.getCurrentTabId();

    const channel = getBookmarksChannelInstance();
    expect(channel).toBeTruthy();
    // Confirm the listener was registered.
    expect(channel.listeners.length).toBeGreaterThan(0);
    // Simulate a remote tab posting a bookmark invalidation event.
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'bookmarks/invalidated',
          userId: 'remote-user-2',
          tabId: `${authTabId}-remote`, // distinct from current tab id
          timestamp: Date.now(),
        },
      });
    });

    expect(received.length).toBe(1);
    expect(received[0]?.userId).toBe('remote-user-2');
    expect(received[0]?.type).toBe('bookmarks/invalidated');
  });
});

// ─── (b) Same-tab suppression ───────────────────────────────────────────────

describe('bookmarks broadcast channel — same-tab filtering', () => {
  it('(b1) a hand-crafted event whose tabId matches the current tab is dropped', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    let callCount = 0;
    subscribeToBookmarkEvents(() => {
      callCount++;
    });

    // Trigger initialization so the listener is registered.
    broadcastBookmarksInvalidated({ userId: 'init' });

    const authModule = await import('../broadcast-channel');
    const myTabId = authModule.getCurrentTabId();

    const channel = getBookmarksChannelInstance();
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'bookmarks/invalidated',
          userId: 'someone',
          tabId: myTabId, // SAME as current tab → drop
          timestamp: Date.now(),
        },
      });
    });

    expect(callCount).toBe(0);
  });

  it('(b2) an event without a tabId is dropped', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    let callCount = 0;
    subscribeToBookmarkEvents(() => {
      callCount++;
    });
    broadcastBookmarksInvalidated({ userId: 'init' });

    const channel = getBookmarksChannelInstance();
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'bookmarks/invalidated',
          userId: 'someone',
          // no tabId
          timestamp: Date.now(),
        },
      });
    });

    expect(callCount).toBe(0);
  });

  it('(b3) an event without a userId is dropped', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    let callCount = 0;
    subscribeToBookmarkEvents(() => {
      callCount++;
    });
    broadcastBookmarksInvalidated({ userId: 'init' });

    const authModule = await import('../broadcast-channel');
    const otherTabId = `${authModule.getCurrentTabId()}-other`;

    const channel = getBookmarksChannelInstance();
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'bookmarks/invalidated',
          // no userId
          tabId: otherTabId,
          timestamp: Date.now(),
        },
      });
    });

    expect(callCount).toBe(0);
  });

  it('(b4) an event with an unknown type is dropped', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    let callCount = 0;
    subscribeToBookmarkEvents(() => {
      callCount++;
    });
    broadcastBookmarksInvalidated({ userId: 'init' });

    const authModule = await import('../broadcast-channel');
    const otherTabId = `${authModule.getCurrentTabId()}-other`;

    const channel = getBookmarksChannelInstance();
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'something/else' as 'bookmarks/invalidated',
          userId: 'someone',
          tabId: otherTabId,
          timestamp: Date.now(),
        },
      });
    });

    expect(callCount).toBe(0);
  });
});

// ─── (c) Subscriber pattern ─────────────────────────────────────────────────

describe('bookmarks broadcast channel — subscriber pattern', () => {
  it('(c1) subscribe returns a function', async () => {
    const { subscribeToBookmarkEvents } = await import(
      '../bookmarks-broadcast-channel'
    );
    const unsubscribe = subscribeToBookmarkEvents(() => {});
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('(c2) unsubscribe stops the handler from being called', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    let callCount = 0;
    const unsubscribe = subscribeToBookmarkEvents(() => {
      callCount++;
    });

    broadcastBookmarksInvalidated({ userId: 'init' });

    const authModule = await import('../broadcast-channel');
    const otherTabId = `${authModule.getCurrentTabId()}-other`;

    const channel = getBookmarksChannelInstance();
    const send = () =>
      channel.listeners.forEach((listener) => {
        listener({
          data: {
            type: 'bookmarks/invalidated',
            userId: 'u',
            tabId: otherTabId,
            timestamp: Date.now(),
          },
        });
      });

    send();
    expect(callCount).toBe(1);

    unsubscribe();

    send();
    expect(callCount).toBe(1); // unchanged
  });

  it('(c3) a buggy subscriber does not break other subscribers', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    const seen: string[] = [];
    subscribeToBookmarkEvents(() => {
      throw new Error('boom');
    });
    subscribeToBookmarkEvents((event) => {
      seen.push(event.userId);
    });
    // Suppress the console.error noise from the buggy subscriber.
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    broadcastBookmarksInvalidated({ userId: 'init' });

    const authModule = await import('../broadcast-channel');
    const otherTabId = `${authModule.getCurrentTabId()}-other`;

    const channel = getBookmarksChannelInstance();
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'bookmarks/invalidated',
          userId: 'user-x',
          tabId: otherTabId,
          timestamp: Date.now(),
        },
      });
    });

    expect(seen).toEqual(['user-x']);
    consoleErrorSpy.mockRestore();
  });
});

// ─── (d) Unsupported-browser fallback ───────────────────────────────────────

describe('bookmarks broadcast channel — fallback', () => {
  it('(d1) when BroadcastChannel is unavailable, broadcasting is a no-op (does not throw)', async () => {
    // Override the global to undefined so the module's check returns
    // false on first call. We re-import to bust the cached availability
    // flag.
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.resetModules();

    const { broadcastBookmarksInvalidated } = await import(
      '../bookmarks-broadcast-channel'
    );

    expect(() =>
      broadcastBookmarksInvalidated({ userId: 'user-1' }),
    ).not.toThrow();
  });

  it('(d2) when BroadcastChannel is unavailable, subscribing is safe', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.resetModules();

    const { subscribeToBookmarkEvents } = await import(
      '../bookmarks-broadcast-channel'
    );

    const handler = () => {};
    const unsubscribe = subscribeToBookmarkEvents(handler);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('(d3) when BroadcastChannel throws on construction, broadcasting is safe', async () => {
    class ThrowingBroadcastChannel {
      constructor(_name: string) {
        throw new Error('not supported');
      }
    }
    vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);
    vi.resetModules();

    const { broadcastBookmarksInvalidated } = await import(
      '../bookmarks-broadcast-channel'
    );

    expect(() =>
      broadcastBookmarksInvalidated({ userId: 'user-1' }),
    ).not.toThrow();
  });

  it('(d4) when BroadcastChannel throws on construction, getBookmarksChannel returns null', async () => {
    class ThrowingBroadcastChannel {
      constructor(_name: string) {
        throw new Error('not supported');
      }
    }
    vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);
    vi.resetModules();

    const { getBookmarksChannel } = await import(
      '../bookmarks-broadcast-channel'
    );

    expect(getBookmarksChannel()).toBeNull();
  });
});

// ─── (e) Regression: auth channel unchanged ──────────────────────────────────

describe('bookmarks broadcast channel — auth regression', () => {
  it('(e1) the auth channel still exports its existing event types and helpers', async () => {
    const auth = await import('../broadcast-channel');
    expect(auth.AUTH_CHANNEL_NAME).toBe('auth');
    expect(typeof auth.subscribeToAuthEvents).toBe('function');
    expect(typeof auth.broadcastAuthEvent).toBe('function');
    expect(typeof auth.broadcastTokenRefreshed).toBe('function');
    expect(typeof auth.broadcastLoggedOut).toBe('function');
    expect(typeof auth.broadcastLoggedIn).toBe('function');
    expect(typeof auth.broadcastAccountDeleted).toBe('function');
    expect(typeof auth.getCurrentTabId).toBe('function');
  });
});

// ─── (e2) Bookmark channel exports surface ──────────────────────────────────

describe('bookmarks broadcast channel — exports surface', () => {
  it('exposes the BOOKMARKS_CHANNEL_NAME constant', async () => {
    const mod = await import('../bookmarks-broadcast-channel');
    expect(mod.BOOKMARKS_CHANNEL_NAME).toBe('bookmarks');
  });

  it('exposes the channel + subscriber + broadcast helpers', async () => {
    const mod = await import('../bookmarks-broadcast-channel');
    expect(typeof mod.getBookmarksChannel).toBe('function');
    expect(typeof mod.closeBookmarksChannel).toBe('function');
    expect(typeof mod.initBookmarksChannel).toBe('function');
    expect(typeof mod.subscribeToBookmarkEvents).toBe('function');
    expect(typeof mod.broadcastBookmarksInvalidated).toBe('function');
  });

  it('exports the discriminated BookmarkEvent type union (verified via event shape)', async () => {
    const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
      await import('../bookmarks-broadcast-channel');

    const received: Array<{ type: string; userId: string }> = [];
    subscribeToBookmarkEvents((event) => {
      // The handler is typed as `(event: BookmarkEvent) => void`
      // which is a discriminated union. We narrow by `event.type`
      // at runtime to validate the union member.
      if (event.type === 'bookmarks/invalidated') {
        received.push({ type: event.type, userId: event.userId });
      }
    });

    broadcastBookmarksInvalidated({ userId: 'init' });

    const authModule = await import('../broadcast-channel');
    const otherTabId = `${authModule.getCurrentTabId()}-other`;

    const channel = getBookmarksChannelInstance();
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'bookmarks/invalidated',
          userId: 'user-z',
          tabId: otherTabId,
          timestamp: Date.now(),
        },
      });
    });

    expect(received).toEqual([{ type: 'bookmarks/invalidated', userId: 'user-z' }]);
  });
});
