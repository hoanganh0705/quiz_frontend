

import { describe, expect, it } from 'vitest';
import {
PROFILE_CHANNEL_NAME,
broadcastProfileUpdated,
closeProfileChannel,
getProfileChannel,
subscribeToProfileEvents,
type ProfileUpdateKind,
type ProfileUpdatedEvent,
} from '../profile-broadcast-channel';

describe('profile-broadcast-channel — public surface', () => {
it('exports PROFILE_CHANNEL_NAME = "profile"', () => {
expect(PROFILE_CHANNEL_NAME).toBe('profile');
  });

it('exports ProfileUpdateKind as a closed union', () => {
const kinds: ProfileUpdateKind[] = ['me', 'settings', 'avatar', 'preferences'];
expect(kinds.length).toBe(4);
  });

it('subscribeToProfileEvents returns an unsubscribe function', () => {
const seen: ProfileUpdatedEvent[] = [];
const unsub = subscribeToProfileEvents((event) => seen.push(event));
expect(typeof unsub).toBe('function');
unsub();
expect(seen).toEqual([]);
  });

it('closeProfileChannel and getProfileChannel exist for cleanup tests', () => {
expect(typeof closeProfileChannel).toBe('function');
expect(typeof getProfileChannel).toBe('function');
  });

it('broadcastProfileUpdated is safe to call with valid and malformed inputs', () => {
expect(() =>
broadcastProfileUpdated({ userId: 'u-1', kind: 'settings' }),
    ).not.toThrow();
expect(() =>
broadcastProfileUpdated({ userId: '', kind: 'me' }),
    ).not.toThrow();
  });
});
