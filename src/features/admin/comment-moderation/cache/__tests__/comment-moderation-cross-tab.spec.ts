

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
broadcastCommentModerationInvalidate: typeof import('../comment-moderation-cross-tab').broadcastCommentModerationInvalidate;
subscribeCommentModerationInvalidate: typeof import('../comment-moderation-cross-tab').subscribeCommentModerationInvalidate;
COMMENT_MODERATION_CHANNEL_NAME: typeof import('../comment-moderation-cross-tab').COMMENT_MODERATION_CHANNEL_NAME;
}> {
const mod = await import('../comment-moderation-cross-tab');

mod.broadcastCommentModerationInvalidate('hide', undefined, '__init__');
return mod;
}

function getCommentModerationChannelInstance(): MockBroadcastChannel {
const instance = MockBroadcastChannel.instances.find(
(candidate) => candidate.name === 'phase7-admin-comment-moderation',
  );
if (!instance) {
throw new Error(
'No `phase7-admin-comment-moderation` channel instance was created; broadcast first.',
    );
  }
return instance;
}

describe('comment-moderation-cross-tab — broadcast emits documented event', () => {
it('COMMENT_MODERATION_CHANNEL_NAME is the documented stable string', async () => {
const mod = await import('../comment-moderation-cross-tab');
expect(mod.COMMENT_MODERATION_CHANNEL_NAME).toBe(
'phase7-admin-comment-moderation',
    );
  });

it('the singleton channel is created on the first broadcast call', async () => {
const { broadcastCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
expect(MockBroadcastChannel.instances.length).toBe(0);
broadcastCommentModerationInvalidate('hide', undefined, 'comment-1');
const channel = MockBroadcastChannel.instances.find(
(instance) => instance.name === 'phase7-admin-comment-moderation',
    );
expect(channel).toBeDefined();
expect(channel?.name).toBe('phase7-admin-comment-moderation');
  });

it('a hand-crafted message with a different tabId reaches subscribers with the documented shape', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

const received: Array<Record<string, unknown>> = [];
subscribeCommentModerationInvalidate((event) => {
received.push({ ...event });
    });

broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const channel = getCommentModerationChannelInstance();
expect(channel.listeners.length).toBeGreaterThan(0);
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
commentId: 'comment-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(received.length).toBe(1);
expect(received[0]).toMatchObject({
type: 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
commentId: 'comment-1',
    });
  });

it('a hand-crafted message without a reportId reaches subscribers with reportId=null', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

const received: Array<Record<string, unknown>> = [];
subscribeCommentModerationInvalidate((event) => {
received.push({ ...event });
    });

broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const channel = getCommentModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'hide',
reportId: null,
commentId: 'comment-2',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(received.length).toBe(1);
expect(received[0]).toMatchObject({
reportId: null,
commentId: 'comment-2',
action: 'hide',
    });
  });
});

describe('comment-moderation-cross-tab — same-tab filtering', () => {
it('a hand-crafted event whose tabId matches the current tab is dropped', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeCommentModerationInvalidate(() => {
callCount++;
    });

broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const myTabId = authModule.getCurrentTabId();

const channel = getCommentModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
commentId: 'comment-1',
tabId: myTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event without a tabId is dropped', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeCommentModerationInvalidate(() => {
callCount++;
    });
broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const channel = getCommentModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
commentId: 'comment-1',
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event without a commentId is dropped', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeCommentModerationInvalidate(() => {
callCount++;
    });
broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getCommentModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event with an unknown action is dropped', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeCommentModerationInvalidate(() => {
callCount++;
    });
broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getCommentModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'unknown' as 'resolve',
reportId: 'report-1',
commentId: 'comment-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event with an unknown type is dropped', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeCommentModerationInvalidate(() => {
callCount++;
    });
broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getCommentModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'something/else' as 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
commentId: 'comment-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });
});

describe('comment-moderation-cross-tab — subscribe / unsubscribe', () => {
it('subscribe returns a function', async () => {
const { subscribeCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
const unsubscribe = subscribeCommentModerationInvalidate(() => {});
expect(typeof unsubscribe).toBe('function');
unsubscribe();
  });

it('unsubscribe stops the handler from being called', async () => {
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
const unsubscribe = subscribeCommentModerationInvalidate(() => {
callCount++;
    });

broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getCommentModerationChannelInstance();
const send = () =>
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
commentId: 'comment-1',
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
const {
subscribeCommentModerationInvalidate,
broadcastCommentModerationInvalidate,
    } = await importAndInitialize();

const seen: string[] = [];
subscribeCommentModerationInvalidate(() => {
throw new Error('boom');
    });
subscribeCommentModerationInvalidate((event) => {
seen.push(event.commentId);
    });
const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

broadcastCommentModerationInvalidate('hide', undefined, '__init__');

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getCommentModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.comment-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
commentId: 'comment-x',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(seen).toEqual(['comment-x']);
consoleErrorSpy.mockRestore();
  });
});

describe('comment-moderation-cross-tab — broadcast guards', () => {
it('does not throw or post when commentId is empty', async () => {
const { broadcastCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
expect(() =>
broadcastCommentModerationInvalidate('hide', undefined, ''),
    ).not.toThrow();
expect(() =>
broadcastCommentModerationInvalidate('hide', undefined, '   '),
    ).not.toThrow();
  });

it('treats missing reportId as null in the payload', async () => {
const { broadcastCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
const spy = vi.spyOn(
MockBroadcastChannel.prototype,
'postMessage',
    );
broadcastCommentModerationInvalidate('hide', undefined, 'comment-1');
expect(spy).toHaveBeenCalled();
const call = spy.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.reportId).toBeNull();
  });

it('keeps a string reportId in the payload', async () => {
const { broadcastCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
const spy = vi.spyOn(
MockBroadcastChannel.prototype,
'postMessage',
    );
broadcastCommentModerationInvalidate(
'resolve',
'report-1',
'comment-1',
    );
expect(spy).toHaveBeenCalled();
const call = spy.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.reportId).toBe('report-1');
  });
});

describe('comment-moderation-cross-tab — fallback', () => {
it('when BroadcastChannel is unavailable, broadcasting is a no-op (does not throw)', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { broadcastCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
expect(() =>
broadcastCommentModerationInvalidate('hide', undefined, 'comment-1'),
    ).not.toThrow();
  });

it('when BroadcastChannel is unavailable, subscribing is safe', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { subscribeCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
const handler = () => {};
const unsubscribe = subscribeCommentModerationInvalidate(handler);
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

const { broadcastCommentModerationInvalidate } = await import(
'../comment-moderation-cross-tab'
    );
expect(() =>
broadcastCommentModerationInvalidate('hide', undefined, 'comment-1'),
    ).not.toThrow();
  });

it('when BroadcastChannel throws on construction, getCommentModerationChannel returns null', async () => {
class ThrowingBroadcastChannel {
constructor(_name: string) {
throw new Error('not supported');
      }
    }
vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);
vi.resetModules();

const { getCommentModerationChannel } = await import(
'../comment-moderation-cross-tab'
    );
expect(getCommentModerationChannel()).toBeNull();
  });
});

describe('comment-moderation-cross-tab — exports surface', () => {
it('exposes the documented helper functions', async () => {
const mod = await import('../comment-moderation-cross-tab');
expect(typeof mod.getCommentModerationChannel).toBe('function');
expect(typeof mod.closeCommentModerationChannel).toBe('function');
expect(typeof mod.initCommentModerationChannel).toBe('function');
expect(typeof mod.subscribeCommentModerationInvalidate).toBe('function');
expect(typeof mod.broadcastCommentModerationInvalidate).toBe('function');
  });
});