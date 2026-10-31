
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dispatchDomainEvent,
  getDomainEventBus,
  resetDomainEventBusForTesting,
  type DomainEvent,
  type UserProfileUpdatedEvent,
} from '@/lib/state/domain-event-bus';

describe('domain-event-bus', () => {
  beforeEach(() => {
    resetDomainEventBusForTesting();
  });

  afterEach(() => {
    resetDomainEventBusForTesting();
  });

  it('delivers events to listeners subscribed to the matching kind', () => {
    const bus = getDomainEventBus();
    const received: UserProfileUpdatedEvent[] = [];
    const unsubscribe = bus.on('USER_PROFILE_UPDATED', (event) => {
      received.push(event);
    });

    const event: UserProfileUpdatedEvent = {
      kind: 'USER_PROFILE_UPDATED',
      userId: 'u-1',
      updateKind: 'me',
      emittedAt: Date.now(),
    };

    dispatchDomainEvent(event);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
    unsubscribe();
  });

  it('does not invoke listeners subscribed to a different kind', () => {
    const bus = getDomainEventBus();
    const authCalls: number[] = [];
    bus.on('AUTH_STATE_CHANGED', () => authCalls.push(1));

    dispatchDomainEvent({
      kind: 'FOLLOW_CHANGED',
      targetUserId: 'u-1',
      actorUserId: 'u-2',
      isFollowing: true,
      emittedAt: Date.now(),
    });

    expect(authCalls).toHaveLength(0);
  });

  it('invokes listeners in registration order', () => {
    const bus = getDomainEventBus();
    const order: string[] = [];
    bus.on('AUTH_STATE_CHANGED', () => order.push('first'));
    bus.on('AUTH_STATE_CHANGED', () => order.push('second'));
    bus.on('AUTH_STATE_CHANGED', () => order.push('third'));

    dispatchDomainEvent({
      kind: 'AUTH_STATE_CHANGED',
      isAuthenticated: true,
      emittedAt: Date.now(),
    });

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('isolates listener errors so other listeners still run', () => {
    const bus = getDomainEventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const later: string[] = [];

    bus.on('NOTIFICATION_RECEIVED', () => {
      throw new Error('boom');
    });
    bus.on('NOTIFICATION_RECEIVED', () => {
      later.push('reached');
    });

    dispatchDomainEvent({
      kind: 'NOTIFICATION_RECEIVED',
      notificationId: 'n-1',
      emittedAt: Date.now(),
    });

    expect(later).toEqual(['reached']);
    errorSpy.mockRestore();
  });

  it('removes a listener when the unsubscribe returned by on() is called', () => {
    const bus = getDomainEventBus();
    const calls: number[] = [];
    const unsubscribe = bus.on('FOLLOW_CHANGED', () => {
      calls.push(1);
    });

    dispatchDomainEvent({
      kind: 'FOLLOW_CHANGED',
      targetUserId: 'u',
      actorUserId: 'a',
      isFollowing: true,
      emittedAt: Date.now(),
    });
    expect(calls).toHaveLength(1);

    unsubscribe();
    dispatchDomainEvent({
      kind: 'FOLLOW_CHANGED',
      targetUserId: 'u',
      actorUserId: 'a',
      isFollowing: true,
      emittedAt: Date.now(),
    });
    expect(calls).toHaveLength(1);
  });

  it('off() removes a specific listener', () => {
    const bus = getDomainEventBus();
    const first: number[] = [];
    const second: number[] = [];
    const firstListener = (): void => {
      first.push(1);
    };
    const secondListener = (): void => {
      second.push(1);
    };

    bus.on('AUTH_STATE_CHANGED', firstListener);
    bus.on('AUTH_STATE_CHANGED', secondListener);

    bus.off('AUTH_STATE_CHANGED', firstListener);

    dispatchDomainEvent({
      kind: 'AUTH_STATE_CHANGED',
      isAuthenticated: false,
      emittedAt: Date.now(),
    });

    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);
  });

  it('dispatchDomainEvent stamps emittedAt when missing', () => {
    const bus = getDomainEventBus();
    const received: DomainEvent[] = [];
    bus.on('COIN_BALANCE_CHANGED', (event) => {
      received.push(event);
    });

    const before = Date.now();
    dispatchDomainEvent({
      kind: 'COIN_BALANCE_CHANGED',
      balance: 100,
      delta: 10,
      reason: 'follow',
    });
    const after = Date.now();

    expect(received).toHaveLength(1);
    const stamp = (received[0] as { emittedAt: number }).emittedAt;
    expect(stamp).toBeGreaterThanOrEqual(before);
    expect(stamp).toBeLessThanOrEqual(after);
  });

  it('dispatchDomainEvent drops malformed events without throwing', () => {
    const bus = getDomainEventBus();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      dispatchDomainEvent(undefined as unknown as DomainEvent),
    ).not.toThrow();
    expect(() =>
      dispatchDomainEvent(null as unknown as DomainEvent),
    ).not.toThrow();
    expect(() =>
      dispatchDomainEvent({} as unknown as DomainEvent),
    ).not.toThrow();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    void bus;
  });

  it('clear() removes every listener', () => {
    const bus = getDomainEventBus();
    const calls: number[] = [];
    bus.on('AUTH_STATE_CHANGED', () => {
      calls.push(1);
    });
    bus.on('FOLLOW_CHANGED', () => {
      calls.push(1);
    });

    bus.clear();

    dispatchDomainEvent({
      kind: 'AUTH_STATE_CHANGED',
      isAuthenticated: true,
      emittedAt: Date.now(),
    });
    dispatchDomainEvent({
      kind: 'FOLLOW_CHANGED',
      targetUserId: 'u',
      actorUserId: 'a',
      isFollowing: true,
      emittedAt: Date.now(),
    });

    expect(calls).toHaveLength(0);
    expect(bus.listenerCount('AUTH_STATE_CHANGED')).toBe(0);
    expect(bus.listenerCount('FOLLOW_CHANGED')).toBe(0);
  });

  it('listenerCount reflects current subscribers', () => {
    const bus = getDomainEventBus();
    expect(bus.listenerCount('AUTH_STATE_CHANGED')).toBe(0);

    const unsubscribe = bus.on('AUTH_STATE_CHANGED', () => {
      /* no-op */
    });
    expect(bus.listenerCount('AUTH_STATE_CHANGED')).toBe(1);

    unsubscribe();
    expect(bus.listenerCount('AUTH_STATE_CHANGED')).toBe(0);
  });

  it('resetDomainEventBusForTesting replaces the singleton', () => {
    const first = getDomainEventBus();
    first.on('AUTH_STATE_CHANGED', () => {
      /* no-op */
    });

    resetDomainEventBusForTesting();

    const second = getDomainEventBus();
    expect(second).not.toBe(first);
    expect(second.listenerCount('AUTH_STATE_CHANGED')).toBe(0);
  });
});
