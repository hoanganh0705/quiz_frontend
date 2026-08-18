

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MockMessageEvent<T = unknown> {
data: T;
}

type MockMessageListener = (event: MockMessageEvent) => void;

class MockBroadcastChannel {
static instances: MockBroadcastChannel[] = [];

public name: string;

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

for (const listener of this.listeners) {
listener({ data });
    }
  }

close(): void {
this.closed = true;
this.listeners = [];
  }
}

beforeEach(() => {
MockBroadcastChannel.instances = [];

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

vi.stubGlobal('window', {});

vi.resetModules();
});

afterEach(() => {
vi.unstubAllGlobals();
vi.restoreAllMocks();
});

async function importAndInitialize(): Promise<{
subscribeToBookmarkEvents: typeof import('../bookmarks-broadcast-channel').subscribeToBookmarkEvents;
broadcastBookmarksInvalidated: typeof import('../bookmarks-broadcast-channel').broadcastBookmarksInvalidated;
}> {
const mod = await import('../bookmarks-broadcast-channel');

mod.broadcastBookmarksInvalidated({ userId: '__init__' });
return mod;
}

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

describe('bookmarks broadcast channel — event delivery', () => {
it('(a1) the singleton channel is created on the first broadcast call', async () => {
const { broadcastBookmarksInvalidated } = await import(
'../bookmarks-broadcast-channel'
    );

expect(MockBroadcastChannel.instances.length).toBe(0);
broadcastBookmarksInvalidated({ userId: 'user-1' });

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

broadcastBookmarksInvalidated({ userId: 'placeholder' });

const authModule = await import('../broadcast-channel');
const authTabId = authModule.getCurrentTabId();

const channel = getBookmarksChannelInstance();
expect(channel).toBeTruthy();

expect(channel.listeners.length).toBeGreaterThan(0);

channel.listeners.forEach((listener) => {
listener({
data: {
type: 'bookmarks/invalidated',
userId: 'remote-user-2',
tabId: `${authTabId}-remote`,
timestamp: Date.now(),
        },
      });
    });

expect(received.length).toBe(1);
expect(received[0]?.userId).toBe('remote-user-2');
expect(received[0]?.type).toBe('bookmarks/invalidated');
  });
});

describe('bookmarks broadcast channel — same-tab filtering', () => {
it('(b1) a hand-crafted event whose tabId matches the current tab is dropped', async () => {
const { subscribeToBookmarkEvents, broadcastBookmarksInvalidated } =
await import('../bookmarks-broadcast-channel');

let callCount = 0;
subscribeToBookmarkEvents(() => {
callCount++;
    });

broadcastBookmarksInvalidated({ userId: 'init' });

const authModule = await import('../broadcast-channel');
const myTabId = authModule.getCurrentTabId();

const channel = getBookmarksChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'bookmarks/invalidated',
userId: 'someone',
tabId: myTabId,
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

describe('bookmarks broadcast channel — fallback', () => {
it('(d1) when BroadcastChannel is unavailable, broadcasting is a no-op (does not throw)', async () => {

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
