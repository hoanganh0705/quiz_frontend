

import axios, {
AxiosInstance,
AxiosRequestConfig,
InternalAxiosRequestConfig,
} from 'axios';
import { mutate as globalMutate } from 'swr';

import { ApiError } from './ApiError';
import { getAuth } from '@/lib/api';

import { isInCooldown, startCooldown, clearCooldown, _resetCooldownForTesting } from './refresh-cooldown';
import { isRefreshTerminalError } from '@/features/auth/errors/refresh-error-codes';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import {
initAuthChannel,
subscribeToAuthEvents,
broadcastTokenRefreshed,
broadcastLoggedOut,
type AuthEvent,
} from './broadcast-channel';
import { isDeletionTerminal, clearDeletionTerminal } from '@/features/auth/lifecycle/deletion-terminal';
import { handleRemoteAccountDeleted } from '@/features/auth/lifecycle/deletion-cross-tab';

const fromAxios = ApiError.fromAxios.bind(ApiError);

import {
getAuthToken,
clearAuthToken,
setAuthToken,
} from '@/features/auth/utils/auth-cookies';

import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { logger } from '@/shared/log';

const API_BASE_URL =
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

type CustomConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let inFlightRefresh: Promise<string> | null = null;

let inFlightRefreshWaiters: Array<{
resolve: (token: string) => void;
reject: (err: unknown) => void;
}> = [];

export function cancelInFlightRefresh(): void {
if (inFlightRefresh === null) return;

const error = new ApiError({
config: undefined,
request: undefined,
response: undefined,
isAxiosError: true,
name: 'AxiosError',
message: 'Refresh cancelled: user logged out',
code: 'AUTH_REFRESH_CANCELLED',
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

for (const waiter of inFlightRefreshWaiters) {
waiter.reject(error);
  }
inFlightRefreshWaiters = [];

inFlightRefresh = null;
}

let lastLogoutTimestamp: number | null = null;

export function markLogout(reason: 'local' | 'remote' = 'local'): void {
lastLogoutTimestamp = Date.now();
logger.info('auth.logout', 'Logout recorded', { reason, at: lastLogoutTimestamp });
}

export function clearLogoutMarker(): void {
lastLogoutTimestamp = null;
}

export function _getLastLogoutTimestampForTesting(): number | null {
return lastLogoutTimestamp;
}

export function _resetRefreshStateForTesting(): void {
inFlightRefresh = null;
inFlightRefreshWaiters = [];
lastLogoutTimestamp = null;
_resetCooldownForTesting();
}

export {
isDeletionTerminal,
markDeletionTerminal,
clearDeletionTerminal,
_isDeletionTerminalForTesting,
} from '@/features/auth/lifecycle/deletion-terminal';

export const customInstance: AxiosInstance = axios.create({
baseURL: API_BASE_URL,
withCredentials: true,
timeout: 10000,
headers: {
'Content-Type': 'application/json',
  },
});

customInstance.interceptors.request.use((config) => {
const token = getAuthToken();
if (token && config.headers) {
config.headers.Authorization = `Bearer ${token}`;
  }
return config;
});

customInstance.interceptors.response.use(

(response) => response,

async (error) => {
const originalRequest = error.config as CustomConfig;
const requestPath = originalRequest?.url;

if (!originalRequest || error.response?.status !== 401) {
return Promise.reject(fromAxios(error));
    }

if (isDeletionTerminal()) {
const cancelled = new ApiError({
config: originalRequest,
request: undefined,
response: undefined,
isAxiosError: true,
name: 'AxiosError',
message: 'Request rejected: account deletion terminal',
code: 'AUTH_DELETION_TERMINAL',
toJSON: () => ({}),
      } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
return Promise.reject(cancelled);
    }

if (requestPath && AUTH_PATHS.some((path) => requestPath.includes(path))) {
return Promise.reject(fromAxios(error));
    }

if (originalRequest._retry) {
clearAuthToken();
if (typeof window !== 'undefined') {
window.location.href = '/login';
      }
return Promise.reject(fromAxios(error));
    }

if (isInCooldown()) {
clearAuthToken();
if (typeof window !== 'undefined') {
window.location.href = '/login';
      }
return Promise.reject(fromAxios(error));
    }

originalRequest._retry = true;

try {

const accessToken = await (inFlightRefresh ??= makeCancellableRefresh());

clearCooldown();

originalRequest.headers = originalRequest.headers ?? {};
originalRequest.headers.Authorization = `Bearer ${accessToken}`;
return customInstance(originalRequest);
    } catch (refreshError) {

startCooldown();

const error = refreshError as ApiError;
const errorCode = error.code ?? '';

if (isRefreshTerminalError(errorCode)) {

logger.warn('auth.refresh', 'Terminal refresh failure', {
errorCode,
action: 'clearing-session',
        });

clearVerificationFlags();

clearAllAuthCache();
clearAuthToken();

broadcastLoggedOut();

if (typeof window !== 'undefined') {
window.location.href = '/login';
        }

return Promise.reject(error);
      }

clearVerificationFlags();

clearAuthToken();

broadcastLoggedOut();

if (typeof window !== 'undefined') {
window.location.href = '/login';
      }

return Promise.reject(error);
    } finally {

inFlightRefresh = null;
    }
  }
);

async function doRefresh(): Promise<string> {

const response = await getAuth().authControllerRefreshToken();

const responseObj = response as unknown as {
data?: { accessToken?: unknown };
accessToken?: unknown;
  };
const accessToken =
responseObj?.data?.accessToken ?? responseObj?.accessToken;

if (typeof accessToken !== 'string' || accessToken.length === 0) {
throw new Error('Refresh token response missing accessToken');
  }

setAuthToken(accessToken);

broadcastTokenRefreshed(accessToken);

return accessToken;
}

export { doRefresh as refreshAccessToken };

function makeCancellableRefresh(): Promise<string> {
return new Promise<string>((resolve, reject) => {

inFlightRefreshWaiters.push({ resolve, reject });

doRefresh()
      .then((token) => {

inFlightRefreshWaiters.forEach((w) => w.resolve(token));
inFlightRefreshWaiters = [];
      })
      .catch((err) => {

inFlightRefreshWaiters.forEach((w) => w.reject(err));
inFlightRefreshWaiters = [];
      });
  });
}

if (typeof window !== 'undefined') {

initAuthChannel();

subscribeToAuthEvents((event: AuthEvent) => {
switch (event.type) {
case 'TOKEN_REFRESHED': {

if (
lastLogoutTimestamp !== null &&
event.timestamp < lastLogoutTimestamp
        ) {

logger.warn('auth.refresh', 'Ignoring late TOKEN_REFRESHED event after logout', {
tokenTimestamp: event.timestamp,
logoutAt: lastLogoutTimestamp,
          });
break;
        }

setAuthToken(event.accessToken);
break;
      }

case 'LOGGED_OUT': {

cancelInFlightRefresh();

markLogout('remote');

clearVerificationFlags();

void globalMutate(
() => true,
undefined,
{ revalidate: true },
        );

clearAuthToken();
if (typeof window !== 'undefined') {
window.location.href = '/login';
        }
break;
      }

case 'LOGGED_IN': {

clearLogoutMarker();

clearDeletionTerminal();

clearVerificationFlags();

void globalMutate(
() => true,
undefined,
{ revalidate: true },
        );

setAuthToken(event.accessToken);
break;
      }

case 'ACCOUNT_DELETED': {

void handleRemoteAccountDeleted(event);
break;
      }
    }
  });

const handlePageHide = () => {

cancelInFlightRefresh();

clearCooldown();
  };

window.addEventListener('pagehide', handlePageHide);
window.addEventListener('beforeunload', handlePageHide);
}

export type { CustomConfig };

export const orvalCustomInstance = async <T>(
config: AxiosRequestConfig
): Promise<T> => {
const response = await customInstance.request<T>(config);
return response.data;
};
