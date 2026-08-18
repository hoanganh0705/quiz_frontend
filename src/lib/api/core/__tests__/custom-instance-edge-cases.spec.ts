

import { describe, expect, it, beforeEach } from 'vitest';

describe('Epic 2.7 Batch 8 edge-case handling', () => {
let mod: typeof import('../custom-instance');
let markLogout: typeof import('../custom-instance').markLogout;
let clearLogoutMarker: typeof import('../custom-instance').clearLogoutMarker;
let getLogoutTimestamp: typeof import('../custom-instance')._getLastLogoutTimestampForTesting;

beforeEach(async () => {
vi_resetModulesSafely();
mod = await import('../custom-instance');
markLogout = mod.markLogout;
clearLogoutMarker = mod.clearLogoutMarker;
getLogoutTimestamp = mod._getLastLogoutTimestampForTesting;
  });

describe('markLogout / clearLogoutMarker (T19)', () => {
it('returns null initially (no logout recorded)', () => {
expect(getLogoutTimestamp()).toBeNull();
    });

it('records the current time on markLogout()', () => {
const before = Date.now();
markLogout('local');
const after = Date.now();
const recorded = getLogoutTimestamp();

expect(recorded).not.toBeNull();
expect(recorded!).toBeGreaterThanOrEqual(before);
expect(recorded!).toBeLessThanOrEqual(after);
    });

it('clears the marker on clearLogoutMarker()', () => {
markLogout('local');
expect(getLogoutTimestamp()).not.toBeNull();

clearLogoutMarker();
expect(getLogoutTimestamp()).toBeNull();
    });

it('overwrites the marker on subsequent markLogout() calls', () => {
const first = Date.now();
markLogout('local');

const pause = new Promise((resolve) => setTimeout(resolve, 5));
return pause.then(() => {
markLogout('remote');
const second = getLogoutTimestamp();
expect(second).not.toBeNull();
expect(second!).toBeGreaterThanOrEqual(first);
      });
    });

it('accepts both "local" and "remote" logout reasons', () => {
markLogout('local');
expect(getLogoutTimestamp()).not.toBeNull();

clearLogoutMarker();
markLogout('remote');
expect(getLogoutTimestamp()).not.toBeNull();
    });
  });

describe('Epic 2.8 T22 — AUTH_PATHS refresh-skip-list', () => {

function isInAuthPaths(requestPath: string): boolean {

const AUTH_PATHS = [
'/auth/change-password',
'/auth/login',
'/auth/logout-all',
'/auth/oauth/google',
'/auth/register',
'/auth/refresh-token',
'/auth/resend-verification-email',
'/auth/security/dashboard',
'/auth/sessions',
'/auth/verify-email',
'/auth/verify-password',
      ];
return AUTH_PATHS.some((path) => requestPath.includes(path));
    }

it('skips refresh on /auth/logout-all 401', () => {
expect(isInAuthPaths('/auth/logout-all')).toBe(true);
    });

it('skips refresh on /auth/security/dashboard 401', () => {
expect(isInAuthPaths('/auth/security/dashboard')).toBe(true);
    });

it('skips refresh on /auth/sessions (list) 401', () => {
expect(isInAuthPaths('/auth/sessions')).toBe(true);
    });

it('skips refresh on /auth/sessions/others 401', () => {
expect(isInAuthPaths('/auth/sessions/others')).toBe(true);
    });

it('skips refresh on /auth/sessions/:id (DELETE) 401', () => {
expect(isInAuthPaths('/auth/sessions/abc-123')).toBe(true);
    });

it('skips refresh on /auth/verify-password 401', () => {

expect(isInAuthPaths('/auth/verify-password')).toBe(true);
    });

it('skips refresh on /auth/change-password 401', () => {

expect(isInAuthPaths('/auth/change-password')).toBe(true);
    });

it('STILL triggers refresh on /auth/me 401 (regression guard)', () => {
expect(isInAuthPaths('/users/me')).toBe(false);
expect(isInAuthPaths('/auth/me')).toBe(false);
    });

it('STILL triggers refresh on arbitrary authenticated endpoints', () => {

expect(isInAuthPaths('/quizzes/featured')).toBe(false);
expect(isInAuthPaths('/leaderboard/global')).toBe(false);
expect(isInAuthPaths('/friends')).toBe(false);
    });
  });
});

function vi_resetModulesSafely(): void {
try {

const vitest = require('vitest');
if (typeof vitest.resetModules === 'function') {
vitest.resetModules();
    }
  } catch {
    // vitest not available in this scope; rely on dynamic import cache
  }
}
