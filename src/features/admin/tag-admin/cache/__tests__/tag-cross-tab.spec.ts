

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
broadcastTagAdminInvalidate: typeof import('../tag-cross-tab').broadcastTagAdminInvalidate;
subscribeTagAdminInvalidate: typeof import('../tag-cross-tab').subscribeTagAdminInvalidate;
TAG_ADMIN_CHANNEL_NAME: typeof import('../tag-cross-tab').TAG_ADMIN_CHANNEL_NAME;
}> {
const mod = await import('../tag-cross-tab');

mod.broadcastTagAdminInvalidate('create', '__init__');
return mod;
}

function getTagAdminChannelInstance(): MockBroadcastChannel {
const instance = MockBroadcastChannel.instances.find(
(candidate) => candidate.name === 'phase7-admin-tag',
  );
if (!instance) {
throw new Error(
'No `phase7-admin-tag` channel instance was created; broadcast first.',
    );
  }
return instance;
}

describe('tag-cross-tab — broadcast emits documented event', () => {
it('TAG_ADMIN_CHANNEL_NAME is the documented stable string', async () => {
const mod = await import('../tag-cross-tab');
expect(mod.TAG_ADMIN_CHANNEL_NAME).toBe('phase7-admin-tag');
  });

it('the singleton channel is created on the first broadcast call', async () => {
const { broadcastTagAdminInvalidate } = await import('../tag-cross-tab');
expect(MockBroadcastChannel.instances.length).toBe(0);
broadcastTagAdminInvalidate('delete', 'tag-1');
const channel = MockBroadcastChannel.instances.find(
(instance) => instance.name === 'phase7-admin-tag',
    );
expect(channel).toBeDefined();
expect(channel?.name).toBe('phase7-admin-tag');
  });

it('a hand-crafted message with a different tabId reaches subscribers with the documented shape', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

const received: Array<Record<string, unknown>> = [];
subscribeTagAdminInvalidate((event) => {
received.push({ ...event });
    });

broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const channel = getTagAdminChannelInstance();
expect(channel.listeners.length).toBeGreaterThan(0);
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation: 'delete',
tagId: 'tag-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(received.length).toBe(1);
expect(received[0]).toMatchObject({
type: 'admin:7.1.tag.invalidate',
mutation: 'delete',
tagId: 'tag-1',
    });
  });

it('a hand-crafted message with each mutation discriminator reaches subscribers', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

const received: string[] = [];
subscribeTagAdminInvalidate((event) => {
received.push(event.mutation);
    });

broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const channel = getTagAdminChannelInstance();
const mutations: Array<'create' | 'update' | 'delete' | 'restore'> = [
'create',
'update',
'delete',
'restore',
    ];
for (const mutation of mutations) {
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation,
tagId: `tag-${mutation}`,
tabId: otherTabId,
timestamp: Date.now(),
          },
        });
      });
    }

expect(received).toEqual(mutations);
  });
});

describe('tag-cross-tab — same-tab filtering', () => {
it('a hand-crafted event whose tabId matches the current tab is dropped', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

let callCount = 0;
subscribeTagAdminInvalidate(() => {
callCount++;
    });

broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const myTabId = authModule.getCurrentTabId();

const channel = getTagAdminChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation: 'delete',
tagId: 'tag-1',
tabId: myTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event without a tabId is dropped', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

let callCount = 0;
subscribeTagAdminInvalidate(() => {
callCount++;
    });
broadcastTagAdminInvalidate('create', '__init__');

const channel = getTagAdminChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation: 'delete',
tagId: 'tag-1',
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event without a tagId is dropped', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

let callCount = 0;
subscribeTagAdminInvalidate(() => {
callCount++;
    });
broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getTagAdminChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation: 'delete',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event with an unknown mutation is dropped', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

let callCount = 0;
subscribeTagAdminInvalidate(() => {
callCount++;
    });
broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getTagAdminChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation: 'unknown' as 'delete',
tagId: 'tag-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event with an unknown type is dropped', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

let callCount = 0;
subscribeTagAdminInvalidate(() => {
callCount++;
    });
broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getTagAdminChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'something/else' as 'admin:7.1.tag.invalidate',
mutation: 'delete',
tagId: 'tag-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });
});

describe('tag-cross-tab — subscribe / unsubscribe', () => {
it('subscribe returns a function', async () => {
const { subscribeTagAdminInvalidate } = await import('../tag-cross-tab');
const unsubscribe = subscribeTagAdminInvalidate(() => {});
expect(typeof unsubscribe).toBe('function');
unsubscribe();
  });

it('unsubscribe stops the handler from being called', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

let callCount = 0;
const unsubscribe = subscribeTagAdminInvalidate(() => {
callCount++;
    });

broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getTagAdminChannelInstance();
const send = () =>
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation: 'delete',
tagId: 'tag-1',
tabId: otherTabId,
timestamp: Date.now(),
          },
        });
      });

send();
expect(callCount).toBe(1);

unsubscribe();

send();
expect(callCount).toBe(1);
  });

it('a buggy subscriber does not break other subscribers', async () => {
const { subscribeTagAdminInvalidate, broadcastTagAdminInvalidate } =
await importAndInitialize();

const seen: string[] = [];
subscribeTagAdminInvalidate(() => {
throw new Error('boom');
    });
subscribeTagAdminInvalidate((event) => {
seen.push(event.tagId);
    });
const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

broadcastTagAdminInvalidate('create', '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getTagAdminChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.tag.invalidate',
mutation: 'delete',
tagId: 'tag-x',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(seen).toEqual(['tag-x']);
consoleErrorSpy.mockRestore();
  });
});

describe('tag-cross-tab — broadcast guards', () => {
it('does not throw or post when tagId is empty', async () => {
const { broadcastTagAdminInvalidate } = await import('../tag-cross-tab');
expect(() => broadcastTagAdminInvalidate('delete', '')).not.toThrow();
expect(() => broadcastTagAdminInvalidate('delete', '   ')).not.toThrow();
  });
});

describe('tag-cross-tab — fallback', () => {
it('when BroadcastChannel is unavailable, broadcasting is a no-op (does not throw)', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { broadcastTagAdminInvalidate } = await import('../tag-cross-tab');
expect(() => broadcastTagAdminInvalidate('delete', 'tag-1')).not.toThrow();
  });

it('when BroadcastChannel is unavailable, subscribing is safe', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { subscribeTagAdminInvalidate } = await import('../tag-cross-tab');
const handler = () => {};
const unsubscribe = subscribeTagAdminInvalidate(handler);
expect(typeof unsubscribe).toBe('function');
unsubscribe();
  });

it('when BroadcastChannel throws on construction, broadcasting is safe', async () => {
class ThrowingBroadcastChannel {
constructor(_name: string) {
throw new Error('not supported');
      }
    }
vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);
vi.resetModules();

const { broadcastTagAdminInvalidate } = await import('../tag-cross-tab');
expect(() => broadcastTagAdminInvalidate('delete', 'tag-1')).not.toThrow();
  });

it('when BroadcastChannel throws on construction, getTagAdminChannel returns null', async () => {
class ThrowingBroadcastChannel {
constructor(_name: string) {
throw new Error('not supported');
      }
    }
vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);
vi.resetModules();

const { getTagAdminChannel } = await import('../tag-cross-tab');
expect(getTagAdminChannel()).toBeNull();
  });
});

describe('tag-cross-tab — exports surface', () => {
it('exposes the documented helper functions', async () => {
const mod = await import('../tag-cross-tab');
expect(typeof mod.getTagAdminChannel).toBe('function');
expect(typeof mod.closeTagAdminChannel).toBe('function');
expect(typeof mod.initTagAdminChannel).toBe('function');
expect(typeof mod.subscribeTagAdminInvalidate).toBe('function');
expect(typeof mod.broadcastTagAdminInvalidate).toBe('function');
  });
});
