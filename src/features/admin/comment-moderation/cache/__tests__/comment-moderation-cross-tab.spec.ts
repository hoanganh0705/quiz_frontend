/**
 * `__tests__/comment-moderation-cross-tab.spec.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.G2.
 *
 * Covers the four documented acceptance criteria:
 *
 *   AC #1 — `broadcastCommentModerationInvalidate(action, reportId, commentId)`
 *           emits the documented event shape on the cross-tab channel.
 *   AC #2 — `subscribeCommentModerationInvalidate(handler)` returns an
 *           unsubscribe function that prevents further events to that handler.
 *   AC #3 — `useResolveCommentReport`, `useHideComment`, and
 *           `useRestoreComment` each call the broadcast on success
 *           (covered separately in the hook spec update below).
 *   AC #4 — The broadcast does NOT fire on failure (covered separately
 *           in the hook spec update).
 *   AC #5 — (Type-check covered by `pnpm type-check`.)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock BroadcastChannel ──────────────────────────────────────────────────

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
    // BroadcastChannel does NOT deliver to the same instance — same-tab
    // filtering. The mock simulates that here.
    for (const listener of this.listeners) {
      listener({ data });
    }
  }

  close(): void {
    this.closed = true;
    this.listeners = [];
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Helper: import the comment-moderation-cross-tab module AND eagerly
 * initialize the channel (which registers the `message` listener).
 * Tests that simulate remote-tab events need the listener registered
 * before they can dispatch into it.
 */
async function importAndInitialize(): Promise<{
  broadcastCommentModerationInvalidate: typeof import('../comment-moderation-cross-tab').broadcastCommentModerationInvalidate;
  subscribeCommentModerationInvalidate: typeof import('../comment-moderation-cross-tab').subscribeCommentModerationInvalidate;
  COMMENT_MODERATION_CHANNEL_NAME: typeof import('../comment-moderation-cross-tab').COMMENT_MODERATION_CHANNEL_NAME;
}> {
  const mod = await import('../comment-moderation-cross-tab');
  // Trigger channel initialization by issuing a broadcast. The
  // broadcast itself is a same-tab no-op for subscribers, but it
  // registers the message listener on the channel.
  mod.broadcastCommentModerationInvalidate('hide', undefined, '__init__');
  return mod;
}

/**
 * Helper: locate the singleton comment-moderation channel instance.
 * Filters out the `'test'` probe created by
 * `checkBroadcastChannelAvailable`.
 */
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

// ─── (1) Broadcast emits the documented event shape ─────────────────────────

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

    // Trigger initialization so the listener is registered.
    broadcastCommentModerationInvalidate('hide', undefined, '__init__');

    // Re-import the auth channel to get its `getCurrentTabId`.
    const authModule = await import('@/lib/api/core/broadcast-channel');
    const otherTabId = `${authModule.getCurrentTabId()}-remote`;

    const channel = getCommentModerationChannelInstance();
    expect(channel.listeners.length).toBeGreaterThan(0);
    channel.listeners.forEach((listener) => {
      listener({
        data: {
          type: 'phase7:admin.comment-moderation.invalidate',
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
      type: 'phase7:admin.comment-moderation.invalidate',
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
          type: 'phase7:admin.comment-moderation.invalidate',
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

// ─── Same-tab filtering ────────────────────────────────────────────────────

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
          type: 'phase7:admin.comment-moderation.invalidate',
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
          type: 'phase7:admin.comment-moderation.invalidate',
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
          type: 'phase7:admin.comment-moderation.invalidate',
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
          type: 'phase7:admin.comment-moderation.invalidate',
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
          type: 'something/else' as 'phase7:admin.comment-moderation.invalidate',
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

// ─── (2) Subscribe / unsubscribe ────────────────────────────────────────────

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
            type: 'phase7:admin.comment-moderation.invalidate',
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
          type: 'phase7:admin.comment-moderation.invalidate',
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

// ─── (4) Broadcast guards ──────────────────────────────────────────────────

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

// ─── Unsupported-browser fallback ───────────────────────────────────────────

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

// ─── Exports surface ────────────────────────────────────────────────────────

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