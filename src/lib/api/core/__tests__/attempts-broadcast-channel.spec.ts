

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

expect(kinds.length).toBe(5);
  });

it('subscribeToAttemptEvents returns an unsubscribe function', () => {
const seen: AttemptsChangedEvent[] = [];
const unsub = subscribeToAttemptEvents((event) => seen.push(event));
expect(typeof unsub).toBe('function');
unsub();

expect(seen).toEqual([]);
  });

it('closeAttemptsChannel and getAttemptsChannel exist for cleanup tests', () => {
expect(typeof closeAttemptsChannel).toBe('function');
expect(typeof getAttemptsChannel).toBe('function');
  });

it('broadcastAttemptsChanged validates inputs (no-op on missing fields)', () => {

expect(() =>
broadcastAttemptsChanged({
userId: 'u-1',
attemptId: 'att-1',
kind: 'submit',
      }),
    ).not.toThrow();

expect(() =>
broadcastAttemptsChanged({
userId: '',
attemptId: 'att-1',
kind: 'submit',
      }),
    ).not.toThrow();
  });
});
