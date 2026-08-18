

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
broadcastReviewModerationInvalidate: typeof import('../review-moderation-cross-tab').broadcastReviewModerationInvalidate;
subscribeReviewModerationInvalidate: typeof import('../review-moderation-cross-tab').subscribeReviewModerationInvalidate;
REVIEW_MODERATION_CHANNEL_NAME: typeof import('../review-moderation-cross-tab').REVIEW_MODERATION_CHANNEL_NAME;
}> {
const mod = await import('../review-moderation-cross-tab');

mod.broadcastReviewModerationInvalidate('resolve', '__init__', null);
return mod;
}

function getReviewModerationChannelInstance(): MockBroadcastChannel {
const instance = MockBroadcastChannel.instances.find(
(candidate) => candidate.name === 'phase7-admin-review-moderation',
  );
if (!instance) {
throw new Error(
'No `phase7-admin-review-moderation` channel instance was created; broadcast first.',
    );
  }
return instance;
}

describe('review-moderation-cross-tab — broadcast emits documented event', () => {
it('REVIEW_MODERATION_CHANNEL_NAME is the documented stable string', async () => {
const mod = await import('../review-moderation-cross-tab');
expect(mod.REVIEW_MODERATION_CHANNEL_NAME).toBe(
'phase7-admin-review-moderation',
    );
  });

it('the singleton channel is created on the first broadcast call', async () => {
const { broadcastReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
expect(MockBroadcastChannel.instances.length).toBe(0);
broadcastReviewModerationInvalidate('resolve', 'report-1', null);
const channel = MockBroadcastChannel.instances.find(
(instance) => instance.name === 'phase7-admin-review-moderation',
    );
expect(channel).toBeDefined();
expect(channel?.name).toBe('phase7-admin-review-moderation');
  });

it('a hand-crafted message with a different tabId reaches subscribers with the documented shape', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

const received: Array<Record<string, unknown>> = [];
subscribeReviewModerationInvalidate((event) => {
received.push({ ...event });
    });

broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const channel = getReviewModerationChannelInstance();
expect(channel.listeners.length).toBeGreaterThan(0);
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
reviewId: 'review-1',
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(received.length).toBe(1);
expect(received[0]).toMatchObject({
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
reviewId: 'review-1',
    });
  });

it('a hand-crafted message without a reviewId reaches subscribers with reviewId=null', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

const received: Array<Record<string, unknown>> = [];
subscribeReviewModerationInvalidate((event) => {
received.push({ ...event });
    });

broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-remote`;

const channel = getReviewModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-2',
reviewId: null,
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(received.length).toBe(1);
expect(received[0]).toMatchObject({
reportId: 'report-2',
reviewId: null,
    });
  });
});

describe('review-moderation-cross-tab — same-tab filtering', () => {
it('a hand-crafted event whose tabId matches the current tab is dropped', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeReviewModerationInvalidate(() => {
callCount++;
    });

broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const myTabId = authModule.getCurrentTabId();

const channel = getReviewModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
reviewId: null,
tabId: myTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event without a tabId is dropped', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeReviewModerationInvalidate(() => {
callCount++;
    });
broadcastReviewModerationInvalidate('resolve', '__init__', null);

const channel = getReviewModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
reviewId: null,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event without a reportId is dropped', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeReviewModerationInvalidate(() => {
callCount++;
    });
broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getReviewModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reviewId: null,
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event with an unknown action is dropped', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeReviewModerationInvalidate(() => {
callCount++;
    });
broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getReviewModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'unknown' as 'resolve',
reportId: 'report-1',
reviewId: null,
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });

it('an event with an unknown type is dropped', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
subscribeReviewModerationInvalidate(() => {
callCount++;
    });
broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getReviewModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'something/else' as 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
reviewId: null,
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(callCount).toBe(0);
  });
});

describe('review-moderation-cross-tab — subscribe / unsubscribe', () => {
it('subscribe returns a function', async () => {
const { subscribeReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
const unsubscribe = subscribeReviewModerationInvalidate(() => {});
expect(typeof unsubscribe).toBe('function');
unsubscribe();
  });

it('unsubscribe stops the handler from being called', async () => {
const {
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

let callCount = 0;
const unsubscribe = subscribeReviewModerationInvalidate(() => {
callCount++;
    });

broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getReviewModerationChannelInstance();
const send = () =>
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-1',
reviewId: null,
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
subscribeReviewModerationInvalidate,
broadcastReviewModerationInvalidate,
    } = await importAndInitialize();

const seen: string[] = [];
subscribeReviewModerationInvalidate(() => {
throw new Error('boom');
    });
subscribeReviewModerationInvalidate((event) => {
seen.push(event.reportId);
    });
const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

broadcastReviewModerationInvalidate('resolve', '__init__', null);

const authModule = await import('@/lib/api/core/broadcast-channel');
const otherTabId = `${authModule.getCurrentTabId()}-other`;

const channel = getReviewModerationChannelInstance();
channel.listeners.forEach((listener) => {
listener({
data: {
type: 'admin:7.1.review-moderation.invalidate',
action: 'resolve',
reportId: 'report-x',
reviewId: null,
tabId: otherTabId,
timestamp: Date.now(),
        },
      });
    });

expect(seen).toEqual(['report-x']);
consoleErrorSpy.mockRestore();
  });
});

describe('review-moderation-cross-tab — broadcast guards', () => {
it('does not throw or post when reportId is empty', async () => {
const { broadcastReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
expect(() =>
broadcastReviewModerationInvalidate('resolve', '', null),
    ).not.toThrow();
expect(() =>
broadcastReviewModerationInvalidate('resolve', '   ', null),
    ).not.toThrow();
  });

it('treats null reviewId as null in the payload', async () => {
const { broadcastReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
const spy = vi.spyOn(
MockBroadcastChannel.prototype,
'postMessage',
    );
broadcastReviewModerationInvalidate('resolve', 'report-1', null);
expect(spy).toHaveBeenCalled();
const call = spy.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.reviewId).toBeNull();
  });

it('keeps a string reviewId in the payload', async () => {
const { broadcastReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
const spy = vi.spyOn(
MockBroadcastChannel.prototype,
'postMessage',
    );
broadcastReviewModerationInvalidate('resolve', 'report-1', 'review-1');
expect(spy).toHaveBeenCalled();
const call = spy.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.reviewId).toBe('review-1');
  });
});

describe('review-moderation-cross-tab — fallback', () => {
it('when BroadcastChannel is unavailable, broadcasting is a no-op (does not throw)', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { broadcastReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
expect(() =>
broadcastReviewModerationInvalidate('resolve', 'report-1', null),
    ).not.toThrow();
  });

it('when BroadcastChannel is unavailable, subscribing is safe', async () => {
vi.stubGlobal('BroadcastChannel', undefined);
vi.resetModules();

const { subscribeReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
const handler = () => {};
const unsubscribe = subscribeReviewModerationInvalidate(handler);
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

const { broadcastReviewModerationInvalidate } = await import(
'../review-moderation-cross-tab'
    );
expect(() =>
broadcastReviewModerationInvalidate('resolve', 'report-1', null),
    ).not.toThrow();
  });

it('when BroadcastChannel throws on construction, getReviewModerationChannel returns null', async () => {
class ThrowingBroadcastChannel {
constructor(_name: string) {
throw new Error('not supported');
      }
    }
vi.stubGlobal('BroadcastChannel', ThrowingBroadcastChannel);
vi.resetModules();

const { getReviewModerationChannel } = await import(
'../review-moderation-cross-tab'
    );
expect(getReviewModerationChannel()).toBeNull();
  });
});

describe('review-moderation-cross-tab — exports surface', () => {
it('exposes the documented helper functions', async () => {
const mod = await import('../review-moderation-cross-tab');
expect(typeof mod.getReviewModerationChannel).toBe('function');
expect(typeof mod.closeReviewModerationChannel).toBe('function');
expect(typeof mod.initReviewModerationChannel).toBe('function');
expect(typeof mod.subscribeReviewModerationInvalidate).toBe('function');
expect(typeof mod.broadcastReviewModerationInvalidate).toBe('function');
  });
});
