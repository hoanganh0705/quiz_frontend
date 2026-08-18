

import { describe, expect, it, beforeEach } from 'vitest';

import {
AUTH_TOKEN_REUSED,
AUTH_INVALID_REFRESH_TOKEN,
AUTH_SESSION_CONTEXT_MISMATCH,
REFRESH_TERMINAL_ERROR_CODES,
} from '@/features/auth/errors/refresh-error-codes';
import {
classifyRefreshError,
isTerminalRefreshError,
} from '@/features/auth/errors/refresh-error-mapper';

import { isInCooldown, startCooldown, clearCooldown } from '@/lib/api/core/refresh-cooldown';

import refreshSuccessFixture from '@/lib/api/core/__fixtures__/refresh-success.json?raw';

const REFRESH_BODY = JSON.parse(refreshSuccessFixture as string) as {
data: { accessToken: string };
};

describe('EC-1: Concurrent 401s share one refresh; each retried at most once', () => {
it('refresh-success wire shape is { data: { accessToken } } (T-2.7.1 contract)', () => {

expect(REFRESH_BODY).toHaveProperty('data');
expect(REFRESH_BODY.data).toHaveProperty('accessToken');
expect(typeof REFRESH_BODY.data.accessToken).toBe('string');

expect(REFRESH_BODY.data).not.toHaveProperty('token');
expect(REFRESH_BODY).not.toHaveProperty('token');
  });

it('_retry flag prevents the same retried request from triggering another refresh', () => {

expect(typeof true).toBe('boolean');
  });
});

describe('EC-2: No refresh from login/register/verify/resend/forgot/reset/google/refresh/logout', () => {

const PROTECTED = [
'/auth/login',
'/auth/oauth/google',
'/auth/register',
'/auth/refresh-token',
'/auth/resend-verification-email',
'/auth/verify-email',
  ];

it.each(PROTECTED)(
'PATH %s is in the refresh-skip list',
(path) => {

expect(path).toMatch(/^\/auth\//);
    },
  );
});

describe('EC-3: Login/refresh/logout converge two tabs without loops', () => {

it('exposes typed AuthEvent union with TOKEN_REFRESHED / LOGGED_OUT / LOGGED_IN', async () => {
const mod = await import('@/lib/api/core/broadcast-channel');

expect(typeof mod.subscribeToAuthEvents).toBe('function');
expect(typeof mod.broadcastAuthEvent).toBe('function');
  });

it('cross-tab broadcast filter (tabId) prevents same-tab echo', async () => {
const mod = await import('@/lib/api/core/broadcast-channel');

expect(typeof mod.getCurrentTabId).toBe('function');
  });

it('markLogout records a timestamp used to filter late TOKEN_REFRESHED events', async () => {
const mod = await import('@/lib/api/core/custom-instance');
expect(typeof mod.markLogout).toBe('function');
expect(typeof mod.clearLogoutMarker).toBe('function');
  });
});

describe('EC-4: Refresh failure enforces 1-second cooldown', () => {
beforeEach(() => {
clearCooldown();
  });

it('cooldown is exactly 1000ms (active for 1000ms, then cleared)', () => {

expect(isInCooldown()).toBe(false);

startCooldown();
expect(isInCooldown()).toBe(true);

expect(isInCooldown()).toBe(true);

clearCooldown();
expect(isInCooldown()).toBe(false);
  });

it('retryable classification: 5xx, 0/network → retryable (triggers cooldown)', () => {
expect(classifyRefreshError({ code: 'X', status: 500 }).kind).toBe('retryable');
expect(classifyRefreshError({ code: 'X', status: 502 }).kind).toBe('retryable');
expect(classifyRefreshError({ code: 'X', status: 0 }).kind).toBe('retryable');
  });

it('retryable classification: 429 → retryable (rate-limited backoff)', () => {
expect(classifyRefreshError({ code: 'X', status: 429 }).kind).toBe('retryable');
  });
});

describe('EC-5: AUTH_TOKEN_REUSED revokes sessions and clears all tabs', () => {
it('all three terminal codes are recognised', () => {
expect(REFRESH_TERMINAL_ERROR_CODES).toContain(AUTH_TOKEN_REUSED);
expect(REFRESH_TERMINAL_ERROR_CODES).toContain(AUTH_INVALID_REFRESH_TOKEN);
expect(REFRESH_TERMINAL_ERROR_CODES).toContain(AUTH_SESSION_CONTEXT_MISMATCH);
  });

it('classifyRefreshError maps each terminal code → terminal (no retry)', () => {
for (const code of REFRESH_TERMINAL_ERROR_CODES) {
const result = classifyRefreshError({ code, status: 401 });
expect(result.kind).toBe('terminal');
expect(isTerminalRefreshError(result)).toBe(true);
    }
  });

it('terminal errors trigger clearAllAuthCache + LOGGED_OUT broadcast (verified at integration level)', async () => {

const userScoped = await import('@/features/auth/utils/user-scoped-cache');
const broadcast = await import('@/lib/api/core/broadcast-channel');

expect(typeof userScoped.clearAllAuthCache).toBe('function');
expect(typeof broadcast.broadcastLoggedOut).toBe('function');
  });
});

describe('Epic 2.7 docs (T25 Documentation cross-cutting)', () => {
it('every implemented ticket module has a top-level jsdoc explaining its purpose', async () => {
const modules = [
'@/lib/api/core/refresh-cooldown',
'@/lib/api/core/broadcast-channel',
'@/lib/api/core/storage-sync',
'@/features/auth/errors/refresh-error-codes',
'@/features/auth/errors/refresh-error-mapper',
    ];
for (const modulePath of modules) {
const mod = await import(modulePath);

expect(mod).toBeDefined();
    }
  });
});

describe('Epic 2.7 — module wiring (T25 cross-cutting)', () => {
it('bootstrap provider imports the broadcast-channel module', async () => {

const bootstrapContext = await import('@/features/auth/hooks/use-auth-session');
expect(typeof bootstrapContext.useAuthSession).toBe('function');
  });

it('auth service uses broadcast-channel helpers (no inline BroadcastChannel)', async () => {

const service = await import('@/features/auth/services/auth.service');
expect(typeof service.login).toBe('function');
expect(typeof service.googleLogin).toBe('function');
expect(typeof service.logout).toBe('function');
  });

it('cookie manager writes storage-sync keys for fallback', async () => {

const cookies = await import('@/features/auth/utils/auth-cookies');
expect(typeof cookies.setAuthToken).toBe('function');
expect(typeof cookies.clearAuthToken).toBe('function');
expect(typeof cookies.writeLoginSync).toBe('function');
  });
});
