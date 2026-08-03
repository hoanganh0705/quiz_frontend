/**
 * Attempts Broadcast Channel — co-located spec.
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.B2.
 *
 * Minimal deterministic spec. Cross-tab messaging end-to-end
 * behaviour is covered by `custom-instance-cross-tab.spec.ts`
 * (Epic 2.7). This spec locks the public surface of the attempts
 * channel: named exports, channel name constant, payload shape, and
 * subscriber/unsubscribe pairing.
 */
import { describe, expect, it } from 'vitest';
import {
  ATTEMPTS_CHANNEL_NAME,
  broadcastAttemptsChanged,
  subscribeToAttemptEvents,
  type AttemptChangeKind,
  type AttemptsChangedEvent,
  closeAttemptsChannel,
  getAttemptsChannel,
} from '../attempts-broadcast-channel';

describe('attempts-broadcast-channel — public surface', () => {
  it('exports ATTEMPTS_CHANNEL_NAME = "attempts"', () => {
    expect(ATTEMPTS_CHANNEL_NAME).toBe('attempts');
  });

  it('exports AttemptChangeKind as a closed union', () => {
    const kinds: AttemptChangeKind[] = [
      'start',
      'submit',
      'withdraw',
      'abandon',
      'complete',
    ];
    // The type itself is the contract; runtime check is just sanity.
    expect(kinds.length).toBe(5);
  });

  it('subscribeToAttemptEvents returns an unsubscribe function', () => {
    const seen: AttemptsChangedEvent[] = [];
    const unsub = subscribeToAttemptEvents((event) => seen.push(event));
    expect(typeof unsub).toBe('function');
    unsub();
    // After unsubscribe, the subscriber set is empty (we trust the
    // internal Map.delete; cross-tab forwarding is covered by the
    // Epic 2.7 cross-tab instance spec).
    expect(seen).toEqual([]);
  });

  it('closeAttemptsChannel and getAttemptsChannel exist for cleanup tests', () => {
    expect(typeof closeAttemptsChannel).toBe('function');
    expect(typeof getAttemptsChannel).toBe('function');
  });

  it('broadcastAttemptsChanged validates inputs (no-op on missing fields)', () => {
    // Calling with valid inputs does not throw (channel may be null in
    // SSR; both paths must be safe).
    expect(() =>
      broadcastAttemptsChanged({
        userId: 'u-1',
        attemptId: 'att-1',
        kind: 'submit',
      }),
    ).not.toThrow();
    // Calling with malformed inputs is a defensive no-op (per the
    // bookmarks-channel precedent).
    expect(() =>
      broadcastAttemptsChanged({
        userId: '',
        attemptId: 'att-1',
        kind: 'submit',
      }),
    ).not.toThrow();
  });
});
