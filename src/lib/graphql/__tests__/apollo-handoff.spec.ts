
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handoffApolloUpdate } from '@/lib/graphql/apollo-handoff';
import {
  resetDomainEventBusForTesting,
  getDomainEventBus,
  type CoinBalanceChangedEvent,
} from '@/lib/state/domain-event-bus';

describe('apollo-handoff', () => {
  beforeEach(() => {
    resetDomainEventBusForTesting();
  });

  afterEach(() => {
    resetDomainEventBusForTesting();
  });

  it('dispatches the supplied domain event to the bus', () => {
    const bus = getDomainEventBus();
    const received: CoinBalanceChangedEvent[] = [];
    bus.on('COIN_BALANCE_CHANGED', (event) => {
      received.push(event);
    });

    const event: CoinBalanceChangedEvent = {
      kind: 'COIN_BALANCE_CHANGED',
      balance: 250,
      delta: 50,
      reason: 'follow',
      emittedAt: Date.now(),
    };

    handoffApolloUpdate({ cache: {} as never, event });

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(event);
  });

  it('dispatches USER_PROFILE_UPDATED events intact', () => {
    const bus = getDomainEventBus();
    const calls: number[] = [];
    bus.on('USER_PROFILE_UPDATED', () => {
      calls.push(1);
    });

    handoffApolloUpdate({
      cache: {} as never,
      event: {
        kind: 'USER_PROFILE_UPDATED',
        userId: 'u-1',
        updateKind: 'me',
        emittedAt: Date.now(),
      },
    });

    expect(calls).toHaveLength(1);
  });

  it('isolates listener errors so the handoff call still resolves', () => {
    const bus = getDomainEventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after: number[] = [];

    bus.on('AUTH_STATE_CHANGED', () => {
      throw new Error('boom');
    });
    bus.on('AUTH_STATE_CHANGED', () => {
      after.push(1);
    });

    expect(() =>
      handoffApolloUpdate({
        cache: {} as never,
        event: {
          kind: 'AUTH_STATE_CHANGED',
          isAuthenticated: true,
          emittedAt: Date.now(),
        },
      }),
    ).not.toThrow();

    expect(after).toEqual([1]);
    errorSpy.mockRestore();
  });
});
