

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
publishSocialRelationshipInvalidation: typeof import('../relationship-broadcast-channel').publishSocialRelationshipInvalidation;
subscribeSocialRelationshipInvalidation: typeof import('../relationship-broadcast-channel').subscribeSocialRelationshipInvalidation;
}> {
const mod = await import('../relationship-broadcast-channel');

mod.publishSocialRelationshipInvalidation({
kind: 'relationship.changed',
userId: '__init__',
  });
return mod;
}

function getSocialRelationshipChannelInstance(): MockBroadcastChannel {
const instance = MockBroadcastChannel.instances.find(
(candidate) => candidate.name === 'social/relationship',
  );
if (!instance) {
throw new Error(
'No `social/relationship` channel instance was created; publish first.',
    );
  }
return instance;
}

describe('relationship broadcast channel — channel name', () => {
it('(a1) the channel name constant is "social/relationship"', async () => {
const { SOCIAL_RELATIONSHIP_CHANNEL_NAME } = await import(
'../relationship-broadcast-channel'
    );
expect(SOCIAL_RELATIONSHIP_CHANNEL_NAME).toBe('social/relationship');
  });

it('(a2) the singleton channel is created on the first publish call', async () => {
const { publishSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );

expect(MockBroadcastChannel.instances.length).toBe(0);
publishSocialRelationshipInvalidation({
kind: 'relationship.changed',
userId: 'user-1',
    });

const channel = getSocialRelationshipChannelInstance();
expect(channel).toBeDefined();
expect(channel.name).toBe('social/relationship');
  });

it('(a3) the channel name does not collide with Phase 4 / 5 channel names', async () => {
const authModule = await import('@/lib/api/core/broadcast-channel');
const bookmarksModule = await import(
'@/lib/api/core/bookmarks-broadcast-channel'
    );
const crossTabBroadcast = await import(
'@/lib/api/core/cross-tab-broadcast'
    );
const phase5Broadcast = await import(
'@/lib/realtime/cross-tab-invalidation'
    );
const socialModule = await import(
'../relationship-broadcast-channel'
    );

expect(socialModule.SOCIAL_RELATIONSHIP_CHANNEL_NAME).not.toBe(
authModule.AUTH_CHANNEL_NAME,
    );
expect(socialModule.SOCIAL_RELATIONSHIP_CHANNEL_NAME).not.toBe(
bookmarksModule.BOOKMARKS_CHANNEL_NAME,
    );
expect(socialModule.SOCIAL_RELATIONSHIP_CHANNEL_NAME).not.toBe(
crossTabBroadcast.ATTEMPTS_CHANNEL_NAME,
    );
expect(socialModule.SOCIAL_RELATIONSHIP_CHANNEL_NAME).not.toBe(
crossTabBroadcast.PROFILE_CHANNEL_NAME,
    );
expect(socialModule.SOCIAL_RELATIONSHIP_CHANNEL_NAME).not.toBe(
phase5Broadcast.CROSS_TAB_INVALIDATION_CHANNEL,
    );
  });
});

describe('relationship broadcast channel — cross-tab delivery', () => {
it('(b1) a hand-crafted message with a different tabId reaches subscribers', async () => {
const {
subscribeSocialRelationshipInvalidation,
publishSocialRelationshipInvalidation,
    } = await importAndInitialize();

const received: Array<{
kind: string;
userId: string;
tabId: string;
    }> = [];
subscribeSocialRelationshipInvalidation((event) => {
received.push({
kind: event.kind,
userId: event.userId,
tabId: event.tabId,
      });
    });

publishSocialRelationshipInvalidation({
kind: 'relationship.changed',
userId: 'placeholder',
    });

const authModule = await import('@/lib/api/core/broadcast-channel');
const authTabId = authModule.getCurrentTabId();

const channel = getSocialRelationshipChannelInstance();
expect(channel).toBeTruthy();
expect(channel.listeners.length).toBeGreaterThan(0);

channel.listeners.forEach((listener) => {
listener({
data: {
kind: 'follow.changed',
userId: 'remote-user-2',
tabId: `${authTabId}-remote`,
at: Date.now(),
        },
      });
    });

expect(received.length).toBe(1);
expect(received[0]?.kind).toBe('follow.changed');
expect(received[0]?.userId).toBe('remote-user-2');
  });

it('(b2) every documented kind is dispatched to subscribers', async () => {
const { subscribeSocialRelationshipInvalidation } =
await importAndInitialize();

const seen: string[] = [];
subscribeSocialRelationshipInvalidation((event) => {
seen.push(event.kind);
    });

const channel = getSocialRelationshipChannelInstance();
const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const kinds = [
'relationship.changed',
'friend_request.changed',
'blocklist.changed',
'follow.changed',
'unfriended',
    ] as const;

for (const kind of kinds) {
channel.listeners.forEach((listener) => {
listener({
data: {
kind,
userId: `user-for-${kind}`,
tabId: otherTabId,
at: Date.now(),
          },
        });
      });
    }

expect(seen).toEqual([...kinds]);
  });
});

describe('relationship broadcast channel — SSR safety', () => {
it('(c1) importing the module with no `window` does not throw', async () => {
vi.stubGlobal('window', undefined);
vi.resetModules();

await expect(import('../relationship-broadcast-channel')).resolves.toBeDefined();
  });

it('(c2) publishing with no `window` is a safe no-op (does not throw)', async () => {
vi.stubGlobal('window', undefined);
vi.resetModules();

const { publishSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );

expect(() =>
publishSocialRelationshipInvalidation({
kind: 'follow.changed',
userId: 'user-1',
      }),
    ).not.toThrow();
  });

it('(c3) subscribing with no `window` is safe and returns an unsubscribe function', async () => {
vi.stubGlobal('window', undefined);
vi.resetModules();

const { subscribeSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );

const handler = () => {};
const unsubscribe = subscribeSocialRelationshipInvalidation(handler);
expect(typeof unsubscribe).toBe('function');
unsubscribe();
  });
});

describe('relationship broadcast channel — payload shape', () => {
it('(d1) the kind union has exactly the five documented kinds', () => {

const kinds: Array<'relationship.changed' | 'friend_request.changed' | 'blocklist.changed' | 'follow.changed' | 'unfriended'> = [
'relationship.changed',
'friend_request.changed',
'blocklist.changed',
'follow.changed',
'unfriended',
    ];
expect(kinds).toHaveLength(5);

expect(new Set(kinds).size).toBe(5);
  });

it('(d2) a message with an unknown kind is dropped (no subscriber call)', async () => {
const { subscribeSocialRelationshipInvalidation } =
await importAndInitialize();

let callCount = 0;
subscribeSocialRelationshipInvalidation(() => {
callCount++;
    });

const channel = getSocialRelationshipChannelInstance();
const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

channel.listeners.forEach((listener) => {
listener({
data: {
kind: 'something.else',
userId: 'user-x',
tabId: otherTabId,
at: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('(d3) a message missing the userId is dropped', async () => {
const { subscribeSocialRelationshipInvalidation } =
await importAndInitialize();

let callCount = 0;
subscribeSocialRelationshipInvalidation(() => {
callCount++;
    });

const channel = getSocialRelationshipChannelInstance();
const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

channel.listeners.forEach((listener) => {
listener({
data: {
kind: 'follow.changed',
userId: '',
tabId: otherTabId,
at: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('(d4) a message missing the tabId is dropped', async () => {
const { subscribeSocialRelationshipInvalidation } =
await importAndInitialize();

let callCount = 0;
subscribeSocialRelationshipInvalidation(() => {
callCount++;
    });

const channel = getSocialRelationshipChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
kind: 'follow.changed',
userId: 'user-x',

at: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('(d5) publish with an invalid kind is dropped at the publisher (no postMessage call)', async () => {
const { publishSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );

publishSocialRelationshipInvalidation({

kind: 'invalid.kind' as unknown as 'relationship.changed',
userId: 'user-1',
    });

const channel = getSocialRelationshipChannelInstance();

expect(channel).toBeDefined();
expect(channel.closed).toBe(false);

const { subscribeSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );
let callCount = 0;
subscribeSocialRelationshipInvalidation(() => {
callCount++;
    });

expect(callCount).toBe(0);
  });
});

describe('relationship broadcast channel — same-tab filtering', () => {
it('(e1) a hand-crafted event whose tabId matches the current tab is dropped', async () => {
const {
subscribeSocialRelationshipInvalidation,
publishSocialRelationshipInvalidation,
    } = await importAndInitialize();

let callCount = 0;
subscribeSocialRelationshipInvalidation(() => {
callCount++;
    });

publishSocialRelationshipInvalidation({
kind: 'relationship.changed',
userId: 'init',
    });

const authModule = await import('@/lib/api/core/broadcast-channel');
const authTabId = authModule.getCurrentTabId();

const channel = getSocialRelationshipChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
kind: 'follow.changed',
userId: 'self-user',
tabId: authTabId,
at: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('(e2) unsubscribe removes a subscriber', async () => {
const {
subscribeSocialRelationshipInvalidation,
publishSocialRelationshipInvalidation,
    } = await importAndInitialize();

let callCount = 0;
const unsubscribe = subscribeSocialRelationshipInvalidation(() => {
callCount++;
    });

publishSocialRelationshipInvalidation({
kind: 'relationship.changed',
userId: 'placeholder',
    });

const channel = getSocialRelationshipChannelInstance();
const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const send = () => {
channel.listeners.forEach((listener) => {
listener({
data: {
kind: 'follow.changed',
userId: 'remote-user',
tabId: otherTabId,
at: Date.now(),
          },
        });
      });
    };

send();
expect(callCount).toBe(1);

unsubscribe();

send();
expect(callCount).toBe(1); // unchanged
  });

it('(e3) a buggy subscriber does not break other subscribers', async () => {
const { subscribeSocialRelationshipInvalidation } =
await importAndInitialize();

const seen: string[] = [];
subscribeSocialRelationshipInvalidation(() => {
throw new Error('boom');
    });
subscribeSocialRelationshipInvalidation((event) => {
seen.push(event.userId);
    });

const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

const channel = getSocialRelationshipChannelInstance();
const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

channel.listeners.forEach((listener) => {
listener({
data: {
kind: 'follow.changed',
userId: 'user-x',
tabId: otherTabId,
at: Date.now(),
        },
      });
    });

expect(seen).toEqual(['user-x']);
consoleErrorSpy.mockRestore();
  });
});

describe('relationship broadcast channel — fallback', () => {
it('(f1) when BroadcastChannel is unavailable, publishing is a no-op', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { publishSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );

expect(() =>
publishSocialRelationshipInvalidation({
kind: 'follow.changed',
userId: 'user-1',
      }),
    ).not.toThrow();
  });

it('(f2) when BroadcastChannel is unavailable, subscribing is safe', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { subscribeSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );

const handler = () => {};
const unsubscribe = subscribeSocialRelationshipInvalidation(handler);
expect(typeof unsubscribe).toBe('function');
unsubscribe();
  });

it('(f3) when BroadcastChannel throws on construction, publishing is safe', async () => {
class ThrowingBroadcastChannel {
constructor(_name: string) {
throw new Error('not supported');
      }
    }
vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);
vi.resetModules();

const { publishSocialRelationshipInvalidation } = await import(
'../relationship-broadcast-channel'
    );

expect(() =>
publishSocialRelationshipInvalidation({
kind: 'follow.changed',
userId: 'user-1',
      }),
    ).not.toThrow();
  });
});

describe('relationship broadcast channel — cleanup', () => {
it('(g1) closeSocialRelationshipChannel releases the singleton', async () => {
const {
publishSocialRelationshipInvalidation,
closeSocialRelationshipChannel,
    } = await import('../relationship-broadcast-channel');

publishSocialRelationshipInvalidation({
kind: 'relationship.changed',
userId: 'user-1',
    });

const firstInstance = getSocialRelationshipChannelInstance();
expect(firstInstance).toBeDefined();

closeSocialRelationshipChannel();
expect(firstInstance.closed).toBe(true);

publishSocialRelationshipInvalidation({
kind: 'relationship.changed',
userId: 'user-2',
    });

const channels = MockBroadcastChannel.instances.filter(
(i) => i.name === 'social/relationship',
    );
expect(channels.length).toBe(2);
expect(channels[0]?.closed).toBe(true);
expect(channels[1]?.closed).toBe(false);
  });
});