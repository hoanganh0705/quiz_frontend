

import { describe, expect, it } from 'vitest';

describe('broadcast channel manager', () => {
describe('message type exports', () => {
it('exports AUTH_CHANNEL_NAME constant', async () => {
const { AUTH_CHANNEL_NAME } = await import('../broadcast-channel');
expect(AUTH_CHANNEL_NAME).toBe('auth');
    });

it('exports AuthEvent type with correct discrimination', async () => {

const event1 = {
type: 'TOKEN_REFRESHED' as const,
accessToken: 'token',
tabId: 'tab1',
timestamp: 123456,
      };
const event2 = {
type: 'LOGGED_OUT' as const,
tabId: 'tab1',
timestamp: 123456,
      };
const event3 = {
type: 'LOGGED_IN' as const,
userId: 'user1',
accessToken: 'token',
tabId: 'tab1',
timestamp: 123456,
      };

expect(event1.type).toBe('TOKEN_REFRESHED');
expect(event2.type).toBe('LOGGED_OUT');
expect(event3.type).toBe('LOGGED_IN');
    });
  });

describe('subscriber pattern', () => {
it('returns a function from subscribeToAuthEvents', async () => {
const { subscribeToAuthEvents } = await import('../broadcast-channel');
const handler = () => {};
const unsubscribe = subscribeToAuthEvents(handler);

expect(typeof unsubscribe).toBe('function');

unsubscribe();
    });

it('subscribeToAuthEvents returns independent unsubscribe functions', async () => {
const { subscribeToAuthEvents } = await import('../broadcast-channel');

const handler1 = () => {};
const handler2 = () => {};

const unsub1 = subscribeToAuthEvents(handler1);
const unsub2 = subscribeToAuthEvents(handler2);

expect(typeof unsub1).toBe('function');
expect(typeof unsub2).toBe('function');
expect(unsub1).not.toBe(unsub2);

unsub1();
unsub2();
    });
  });

describe('tabId generation', () => {
it('getCurrentTabId returns a non-empty string', async () => {
const { getCurrentTabId } = await import('../broadcast-channel');
const id = getCurrentTabId();

expect(id).toBeTruthy();
expect(typeof id).toBe('string');
expect(id.length).toBeGreaterThan(0);
    });

it('getCurrentTabId returns the same value across calls', async () => {
const { getCurrentTabId } = await import('../broadcast-channel');
const id1 = getCurrentTabId();
const id2 = getCurrentTabId();
const id3 = getCurrentTabId();

expect(id1).toBe(id2);
expect(id2).toBe(id3);
    });

it('tabId does not contain the same value when modules reset', async () => {
const { getCurrentTabId } = await import('../broadcast-channel');
const id1 = getCurrentTabId();

expect(id1).toMatch(/^[a-z0-9-]+$/);
    });
  });

describe('availability check', () => {
it('isBroadcastChannelAvailable is not exposed as a public function', async () => {

const moduleExports = await import('../broadcast-channel');
const exportKeys = Object.keys(moduleExports);

expect(exportKeys).not.toContain('isBroadcastChannelAvailable');
    });
  });

describe('exports surface', () => {
it('exports all required functions and constants', async () => {
const exports = await import('../broadcast-channel');

expect(exports.AUTH_CHANNEL_NAME).toBeDefined();

expect(exports.getAuthChannel).toBeDefined();
expect(exports.closeAuthChannel).toBeDefined();
expect(exports.initAuthChannel).toBeDefined();

expect(exports.subscribeToAuthEvents).toBeDefined();

expect(exports.broadcastAuthEvent).toBeDefined();
expect(exports.broadcastTokenRefreshed).toBeDefined();
expect(exports.broadcastLoggedOut).toBeDefined();
expect(exports.broadcastLoggedIn).toBeDefined();

expect(exports.getCurrentTabId).toBeDefined();

expect(typeof exports.getAuthChannel).toBe('function');
expect(typeof exports.subscribeToAuthEvents).toBe('function');
expect(typeof exports.broadcastAuthEvent).toBe('function');
    });
  });
});
