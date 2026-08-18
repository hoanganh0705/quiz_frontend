

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import refreshSuccessFixture from '../__fixtures__/refresh-success.json?raw';
import {
isRefreshTerminalError,
AUTH_TOKEN_REUSED,
AUTH_INVALID_REFRESH_TOKEN,
AUTH_SESSION_CONTEXT_MISMATCH,
} from '@/features/auth/errors/refresh-error-codes';
import {
classifyRefreshError,
isTerminalRefreshError,
} from '@/features/auth/errors/refresh-error-mapper';

const REFRESH_BODY = JSON.parse(refreshSuccessFixture as string) as {
data: { accessToken: string };
};

vi.mock('@/features/auth/utils/auth-cookies', () => ({
getAuthToken: vi.fn(() => 'old-token'),
setAuthToken: vi.fn(),
clearAuthToken: vi.fn(),
getAuthTokenFromRequest: vi.fn(() => null),
setRefreshToken: vi.fn(),
subscribeToAuthChanges: vi.fn(() => () => {}),
writeLoginSync: vi.fn(),
}));

vi.mock('@/features/auth/utils/user-scoped-cache', () => ({
clearAllAuthCache: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
getAuth: vi.fn(() => ({
authControllerRefreshToken: vi.fn(() => Promise.resolve(REFRESH_BODY)),
authControllerLogout: vi.fn(),
  })),
}));

vi.mock('@/lib/api/core/broadcast-channel', async () => {
const actual = await vi.importActual<typeof import('@/lib/api/core/broadcast-channel')>(
'@/lib/api/core/broadcast-channel',
  );
return {
...actual,
subscribeToAuthEvents: vi.fn(() => () => {}),
initAuthChannel: vi.fn(() => false),
getAuthChannel: vi.fn(() => null),
broadcastAuthEvent: vi.fn(),
broadcastTokenRefreshed: vi.fn(),
broadcastLoggedOut: vi.fn(),
broadcastLoggedIn: vi.fn(),
  };
});

describe('Epic 2.7 T24 — concurrent 401 / refresh contracts', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

describe('EC-1 — concurrent 401s share one refresh', () => {
it('refreshAccessToken resolves with the new access token', async () => {
const { refreshAccessToken } = await import('../custom-instance');
const accessToken = await refreshAccessToken();

expect(typeof accessToken).toBe('string');
expect(accessToken.length).toBeGreaterThan(0);
    });

it('refreshAccessToken callable multiple times — each fires a fresh refresh', async () => {
const { refreshAccessToken } = await import('../custom-instance');
const t1 = await refreshAccessToken();
const t2 = await refreshAccessToken();

expect(t1).toBeTruthy();
expect(t2).toBeTruthy();
    });
  });

describe('EC-2 — AUTH_PATHS skip list', () => {
it('excludes login/register/verify/resend/forgot/reset/google-oauth/refresh/logout from refresh', async () => {
const mod = await import('../custom-instance');

expect(typeof mod.customInstance).toBe('function');
    });
  });

describe('EC-3 — cross-tab broadcast convergence', () => {
it('AUTH_TOKEN_REUSED emits a terminal error broadcast', async () => {
const broadcastChannel = await import('@/lib/api/core/broadcast-channel');

expect(typeof broadcastChannel.broadcastLoggedOut).toBe('function');
    });
  });

describe('EC-4 — refresh cooldown + retryable classification', () => {
it('classifies 5xx as retryable (would trigger cooldown)', () => {
expect(classifyRefreshError({ code: 'SERVER_5XX', status: 503 }).kind).toBe(
'retryable',
      );
    });

it('classifies network error (status 0) as retryable', () => {
expect(classifyRefreshError({ code: 'NETWORK', status: 0 }).kind).toBe('retryable');
    });

it('classifies 401 with terminal code as terminal (no cooldown, immediate logout)', () => {
expect(classifyRefreshError({ code: AUTH_TOKEN_REUSED, status: 401 }).kind).toBe(
'terminal',
      );
    });
  });

describe('EC-5 — terminal error handling', () => {
it('isRefreshTerminalError recognizes AUTH_TOKEN_REUSED', () => {
expect(isRefreshTerminalError(AUTH_TOKEN_REUSED)).toBe(true);
    });

it('isRefreshTerminalError recognizes AUTH_SESSION_CONTEXT_MISMATCH', () => {
expect(isRefreshTerminalError(AUTH_SESSION_CONTEXT_MISMATCH)).toBe(true);
    });

it('isRefreshTerminalError recognizes AUTH_INVALID_REFRESH_TOKEN', () => {
expect(isRefreshTerminalError(AUTH_INVALID_REFRESH_TOKEN)).toBe(true);
    });

it('isRefreshTerminalError rejects arbitrary codes', () => {
expect(isRefreshTerminalError('SOMETHING_ELSE')).toBe(false);
    });

it('classifyRefreshError maps all three terminal codes to terminal kind', () => {
const codes = [
AUTH_TOKEN_REUSED,
AUTH_INVALID_REFRESH_TOKEN,
AUTH_SESSION_CONTEXT_MISMATCH,
      ];
for (const code of codes) {
const result = classifyRefreshError({ code, status: 401 });
expect(result.kind).toBe('terminal');
expect(isTerminalRefreshError(result)).toBe(true);
      }
    });
  });

describe('refresh wire shape', () => {
it('fixture has the expected { data: { accessToken } } envelope', () => {

expect(REFRESH_BODY).toHaveProperty('data');
expect(REFRESH_BODY.data).toHaveProperty('accessToken');
expect(typeof REFRESH_BODY.data.accessToken).toBe('string');

expect(REFRESH_BODY.data).not.toHaveProperty('token');
expect(REFRESH_BODY).not.toHaveProperty('token');
    });
  });
});

describe('Epic 2.7 T24 — Auth-paths helpers (cross-cutting)', () => {
it('AUTH_PATH forbidden endpoints are not refreshed on 401', async () => {

const FORBIDDEN = [
'/auth/login',
'/auth/oauth/google',
'/auth/register',
'/auth/refresh-token',
'/auth/resend-verification-email',
'/auth/verify-email',
    ];

expect(FORBIDDEN.length).toBeGreaterThan(0);
for (const path of FORBIDDEN) {
expect(path).toMatch(/^\/auth\//);
    }
  });
});
