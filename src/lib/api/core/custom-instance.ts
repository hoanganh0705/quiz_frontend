/**
 * Custom Axios instance with auth interceptors.
 * Handles token refresh, cross-tab sync, and 401 refresh retries.
 *
 * ## Envelope shape
 *
 * The interceptor does **not** unwrap the backend's `{ data, meta }`
 * envelope — see the long-form comment on the response interceptor
 * below for the rationale. The generated SDK types
 * (`orvalCustomInstance<WrapperXxx200>`) already encode the wrapped
 * shape, and 30+ call sites (every list, every paginated fetcher,
 * every auth caller) read `.data` / `.meta.pagination` directly, so
 * the SDK contract is the source of truth and the interceptor
 * passes the wire shape through unmodified.
 */

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

// Auth utilities (to be created in features/auth/utils)
import {
  getAuthToken,
  clearAuthToken,
  setAuthToken,
} from '@/features/auth/utils/auth-cookies';

import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { logger } from '@/shared/log';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Paths that should NOT trigger token refresh on 401.
//
// Source epic: Epic 2.8 — Security dashboard and active-session management.
// Source ticket: 2.8.T22.
//
// Source epic: Epic 2.9 — Password re-verification and password change.
// Source ticket: 2.9.T16.
//
// Session-management endpoints must NOT trigger a refresh on
// 401: the request itself is what the user asked for, and
// auto-retrying via refresh would mask a real session-loss or
// a permission boundary. The error mapper (2.8.T2) classifies
// these 401s into `auth_terminal` so the hook / UI surface
// them directly.
//
// Password-management endpoints (`/auth/verify-password`,
// `/auth/change-password`) follow the same rule: a 401 there
// means the user's session is gone, and the right action is
// forced reauthentication, not a silent refresh. The shared
// final-logout policy in Epic 2.7 still applies to terminal
// 401s.
//
// Array is alphabetically grouped (T22 / T16 acceptance criterion 4):
// `/auth/change-password`, `/auth/login`, `/auth/logout-all`,
// `/auth/oauth/...`, `/auth/register`, `/auth/refresh-token`,
// `/auth/resend-verification-email`, `/auth/security/dashboard`,
// `/auth/sessions`, `/auth/verify-email`, `/auth/verify-password`.
const AUTH_PATHS = [
  '/auth/change-password',
  '/auth/login',
  '/auth/logout-all',
  '/auth/oauth/google',      // Google OAuth exchanges do not use refresh tokens
  '/auth/register',
  '/auth/refresh-token',
  '/auth/resend-verification-email',
  '/auth/security/dashboard',
  // `/auth/sessions` matches:
  //   - GET   /auth/sessions         (list)
  //   - DELETE /auth/sessions/others (bulk revoke others)
  //   - DELETE /auth/sessions/:id    (single revoke)
  '/auth/sessions',
  '/auth/verify-email',
  '/auth/verify-password',
];

type CustomConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Module-level Promise-share for the refresh endpoint.
 *
 * Source ticket: TKT-1.4.2.3 (Epic 1.4, US-1.4.2).
 *
 * When the first concurrent 401 hits the interceptor, this is set to a
 * Promise<string> wrapping the refresh call. Subsequent concurrent 401s
 * `await inFlightRefresh` instead of firing a second refresh call. The
 * Promise is reset to `null` in a `finally` block so a later (legitimate)
 * refresh can fire fresh.
 *
 * ### Epic 2.7 edge cases
 *
 * **T18 — Logout during pending refresh.** When `LOGGED_OUT` arrives,
 * `cancelInFlightRefresh()` clears `inFlightRefresh` and rejects any
 * pending waiters with a synthetic ApiError so the interceptor's
 * response handlers do not run `window.location.href = '/login'`
 * after the user has already been redirected.
 *
 * **T17 — Tab close during refresh.** A `pagehide` handler resets
 * `inFlightRefresh` to `null` and clears the cooldown. Promises in
 * flight are JavaScript values, so this only severs the references; the
 * underlying SDK call will continue running inside the closure but its
 * `then` handlers (which would touch `window.location`) will be a no-op
 * because the tab is unloading.
 */
let inFlightRefresh: Promise<string> | null = null;

/**
 * Set of waiter functions (resolvers/rejecters) attached to the current
 * `inFlightRefresh`. Used by `cancelInFlightRefresh` (T18) to reject all
 * pending waiters when a logout event arrives while the refresh is in
 * flight.
 */
let inFlightRefreshWaiters: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

/**
 * Cancels the in-flight refresh (if any). Pending waiters receive a
 * synthetic `ApiError` so they reject and bypass the redirect path.
 *
 * Source epic: Epic 2.7.
 * Source ticket: 2.7.T18 — Handle logout event arriving while refresh is pending.
 */
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

  // Reject each waiter that captured the promise
  for (const waiter of inFlightRefreshWaiters) {
    waiter.reject(error);
  }
  inFlightRefreshWaiters = [];

  // Drop the reference so a future refresh can fire fresh
  inFlightRefresh = null;
}

/**
 * Last observed logout timestamp (ms epoch). Any cross-tab TOKEN_REFRESHED
 * event older than this is ignored — it is a "late" event from before
 * the logout took effect.
 *
 * Source epic: Epic 2.7.
 * Source ticket: 2.7.T19 — Handle late TOKEN_REFRESHED after LOGOUT.
 */
let lastLogoutTimestamp: number | null = null;

/**
 * Records a logout timestamp. Any later `TOKEN_REFRESHED` events with
 * an older `timestamp` are discarded by the cross-tab listener.
 *
 * Source epic: Epic 2.7.
 * Source ticket: 2.7.T19.
 */
export function markLogout(reason: 'local' | 'remote' = 'local'): void {
  lastLogoutTimestamp = Date.now();
  logger.info('auth.logout', 'Logout recorded', { reason, at: lastLogoutTimestamp });
}

/**
 * Resets the logout marker. Called after a fresh LOGGED_IN event so
 * the new session is not blocked by the previous logout's timestamp.
 *
 * Source epic: Epic 2.7.
 * Source ticket: 2.7.T19.
 */
export function clearLogoutMarker(): void {
  lastLogoutTimestamp = null;
}

/**
 * Returns the last logout timestamp (or null if none has been recorded).
 * Exposed for testing only — production callers use `markLogout` /
 * `clearLogoutMarker`.
 *
 * Source epic: Epic 2.7.
 * Source ticket: 2.7.T19.
 */
export function _getLastLogoutTimestampForTesting(): number | null {
  return lastLogoutTimestamp;
}

/**
 * Resets the module-level refresh state for tests. Call from `beforeEach`
 * to ensure the previous test's cooldown, in-flight refresh, and waiters
 * do not leak into the next test.
 *
 * Source epic: Epic 2.7.
 * Source ticket: Test cleanup — prevent cooldown / in-flight leakage.
 */
export function _resetRefreshStateForTesting(): void {
  inFlightRefresh = null;
  inFlightRefreshWaiters = [];
  lastLogoutTimestamp = null;
  _resetCooldownForTesting();
}

/**
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T23.
 *
 * The deletion-terminal marker lives in
 * `@/features/auth/lifecycle/deletion-terminal` so the
 * lifecycle modules can read it without depending on
 * `custom-instance.ts`. We re-export it through `custom-instance.ts`
 * for compatibility with existing call sites.
 */
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

// ─── Request Interceptor: Attach Bearer Token ─────────────────────────────────

customInstance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Unwrap Envelope + Handle 401 ────────────────────────
//
// ## Why the interceptor does NOT unwrap the envelope
//
// The Axios response interceptor historically did:
//   response.data = unwrapResponseData(response.data);
// i.e. it mutated `response.data` to be the inner payload. That was
// the "unwrapped-everywhere" design that lets consumers write
// `result` instead of `result.data`.
//
// That design conflicts with the **generated SDK contract**:
// every generated `orvalCustomInstance<WrapperXxx200>` return is
// typed as the *wrapped* envelope (e.g. `QuizControllerGetFeaturedQuizzes200
// = WrappedDto & { data?: QuizListItemDto[] }`). 30+ hook/service
// call sites (every list, every paginated fetcher, every auth
// caller) do `result.data ?? []`, `result.meta?.pagination?.nextCursor`,
// or `if (!data.data) throw` — all of which silently return
// `undefined` / `[]` when the interceptor pre-unwraps the response.
//
// Cursor-paginated endpoints are the most visible breakage: the
// pagination metadata lives in the **outer** envelope
// (`meta.pagination`), and once the interceptor strips it the
// fetcher cannot reconstruct `nextCursor` / `hasNextPage` for the
// next page. Every paginated hook in the app currently shows an
// empty list on the first page (and never advances).
//
// Reverting the unwrap here restores the documented SDK contract:
// the interceptor passes the raw wire shape through, the SDK
// returns the wrapped envelope, and consumers that need the inner
// payload read `.data` (or `.meta.pagination` for cursor pages).
// The `unwrapEnvelope` / `unwrapEnvelopeValue` helpers remain
// available for the few callers that need the discriminated form
// (e.g. `auth-only-instance.ts` for the unauthenticated auth flow).
customInstance.interceptors.response.use(
  // Success: pass through (the SDK types and consumers expect the
  // wrapped envelope, not the inner payload).
  (response) => response,

  // Error: handle 401 token refresh
  async (error) => {
    const originalRequest = error.config as CustomConfig;
    const requestPath = originalRequest?.url;

    // Not a 401, or an auth endpoint → reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(fromAxios(error));
    }

    // Source epic: Epic 2.10 — Permanent account deletion.
    // Source ticket: 2.10.T23.
    //
    // After deletion is terminal, the access token presented by the
    // browser is no longer valid (the backend has invalidated every
    // session the cookie might resolve to). Attempting a refresh
    // would:
    //   - hit the backend's already-deleted session,
    //   - return a terminal refresh error,
    //   - feed the error into the 401 handler's redirect path,
    //   - possibly re-establish a transient session via the broadcast
    //     channel if the late response is mishandled.
    // None of those are acceptable. Short-circuit with a synthetic
    // auth-cookie-gone error so the caller's promise rejects cleanly
    // and the protected UI sees the deletion-terminal state.
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

    // Prevent the same retried request from triggering a second refresh.
    if (originalRequest._retry) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(fromAxios(error));
    }

    // Block refresh if cooldown is active (prevents spin loops)
    if (isInCooldown()) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(fromAxios(error));
    }

    originalRequest._retry = true;

    try {
      // Reuse an in-flight refresh (concurrent 401s) or kick off a fresh one.
      // Source ticket: Epic 2.7 T18 — the refresh promise carries an
      // `onCancel` callback that lets `cancelInFlightRefresh` reject pending
      // waiters without killing the underlying SDK call.
      const accessToken = await (inFlightRefresh ??= makeCancellableRefresh());

      // Refresh succeeded — clear any active cooldown
      clearCooldown();

      // Retry original request with new token
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return customInstance(originalRequest);
    } catch (refreshError) {
      // Refresh failed — start cooldown to prevent spin loop
      startCooldown();

      // Classify the error to determine if it's terminal
      const error = refreshError as ApiError;
      const errorCode = error.code ?? '';

      // Terminal errors: clear everything and redirect immediately
      if (isRefreshTerminalError(errorCode)) {
        // Security events: log for audit trail
        logger.warn('auth.refresh', 'Terminal refresh failure', {
          errorCode,
          action: 'clearing-session',
        });

        // Epic 2.9 / 2.9.T10 — wipe any in-memory "recently verified"
        // flags so a stale flag cannot survive a forced logout.
        clearVerificationFlags();

        // Clear all caches and tokens
        clearAllAuthCache();
        clearAuthToken();

        // Broadcast logout to other tabs
        broadcastLoggedOut();

        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }

      // Epic 2.9 / 2.9.T10 — wipe any in-memory "recently verified"
      // flags so a stale flag cannot survive a forced logout.
      clearVerificationFlags();

      // Non-terminal failures: clear token and redirect
      clearAuthToken();

      // Broadcast logout to other tabs
      broadcastLoggedOut();

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    } finally {
      // Reset the in-flight slot so a later request (e.g. 5 minutes after
      // the refresh resolves) can fire a fresh refresh.
      inFlightRefresh = null;
    }
  }
);

/**
 * Run the refresh-token flow exactly once. Returns the new access token on
 * success, throws on failure. Captured in a module-level Promise by
 * `inFlightRefresh` so concurrent 401s share the same network call.
 *
 * Uses the SDK's `authControllerRefreshToken()` for consistent envelope
 * unwrapping and transport configuration.
 */
async function doRefresh(): Promise<string> {
  // Use SDK for consistent transport configuration. `orvalCustomInstance`
  // returns the wrapped envelope as-is (the response interceptor does
  // NOT unwrap — see the long-form comment above the interceptor), so
  // `response` is the full `{ data, meta }` shape with the new
  // access token nested under `response.data`.
  const response = await getAuth().authControllerRefreshToken();

  // The SDK may surface the payload as the wrapped envelope or as the
  // inner field (defensive against future SDK wiring drift). Both
  // shapes are supported.
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

  // Broadcast refresh to other tabs
  broadcastTokenRefreshed(accessToken);

  return accessToken;
}

export { doRefresh as refreshAccessToken };

/**
 * Wrap `doRefresh()` in a Promise that can be cancelled by
 * `cancelInFlightRefresh()` (Epic 2.7 T18).
 *
 * When the cancellation fires:
 *   - The original `doRefresh()` Promise keeps running in the background
 *     (Promises can't actually be cancelled; only their awaiters can be).
 *   - Pending waiters resolve/reject immediately so the interceptor's
 *     `await` returns before the SDK call finishes, preventing the
 *     redirect-then-retry race.
 *   - `inFlightRefreshWaiters` is the registry that makes this work.
 *
 * ## Why not just `doRefresh()`?
 *
 * A raw `doRefresh()` Promise cannot be cancelled. By wrapping it in a
 * Promise whose `resolve`/`reject` are exposed to `cancelInFlightRefresh`,
 * we give the logout listener a lever to short-circuit the interceptor's
 * await without killing the network call.
 *
 * Source epic: Epic 2.7.
 * Source ticket: 2.7.T18.
 */
function makeCancellableRefresh(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Register this caller as a waiter
    inFlightRefreshWaiters.push({ resolve, reject });

    // Kick off the actual refresh (or attach to the existing in-flight one
    // by relying on the interceptor's `??=` assignment)
    doRefresh()
      .then((token) => {
        // Resolve all waiters with the new token, then drop the registry.
        inFlightRefreshWaiters.forEach((w) => w.resolve(token));
        inFlightRefreshWaiters = [];
      })
      .catch((err) => {
        // Reject all waiters with the same error, then drop the registry.
        inFlightRefreshWaiters.forEach((w) => w.reject(err));
        inFlightRefreshWaiters = [];
      });
  });
}

// ─── Cross-Tab Sync ───────────────────────────────────────────────────────────

/**
 * Initialize cross-tab auth event sync.
 *
 * Uses the centralized broadcast channel module to:
 * 1. Initialize the BroadcastChannel (lazily)
 * 2. Subscribe to events from other tabs
 * 3. Handle each event type appropriately
 *
 * The same-tab filter (by tabId) prevents this tab from receiving its own
 * broadcasts, eliminating event loops.
 *
 * ### Epic 2.7 edge cases (handled in the listener below)
 *
 * - **T18**: `LOGGED_OUT` cancels any in-flight refresh before broadcasting
 *   the redirect.
 * - **T19**: Late `TOKEN_REFRESHED` events arriving after a logout are
 *   ignored via a timestamp comparison.
 */
if (typeof window !== 'undefined') {
  // Initialize the channel
  initAuthChannel();

  // Subscribe to auth events from other tabs
  subscribeToAuthEvents((event: AuthEvent) => {
    switch (event.type) {
      case 'TOKEN_REFRESHED': {
        // T19 — late TOKEN_REFRESHED after LOGOUT must be ignored.
        // Compare event timestamp against our recorded logout marker;
        // any event older than the marker is a "late" event from a tab
        // that had already logged out. We do NOT want to re-establish
        // a session from a stale token.
        if (
          lastLogoutTimestamp !== null &&
          event.timestamp < lastLogoutTimestamp
        ) {
          // Silent drop — the user logged out, this token is from before.
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
        // T18 — cancel any pending refresh before we run the redirect path.
        // This prevents the late refresh completion from clobbering the
        // redirect's `clearAuthToken()` call and re-establishing a session.
        cancelInFlightRefresh();

        // T19 — record the logout timestamp so late TOKEN_REFRESHED events
        // can be filtered.
        markLogout('remote');

        // Epic 2.9 / 2.9.T10 — wipe any in-memory "recently verified"
        // flags so a stale flag cannot survive a logout broadcast from
        // a sibling tab. The flag is purely a UX optimization; this
        // wipe is what guarantees a fresh verify on the next sensitive
        // action in this tab.
        clearVerificationFlags();

        // Epic 2.x — clear every entry in the SWR in-memory cache so
        // the previous user's API responses (the bell badge's
        // `["notifications", "unread-count"]`, the center page's
        // `["notifications", "list", ...]`, every `useUser*` hook,
        // etc.) do not survive in this tab's cache and leak to the
        // next user / next session. SWR's `mutate(() => true, …,
        // { revalidate: true })` is the canonical wildcard idiom.
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
        // T19 — a fresh login resets the logout marker so future
        // TOKEN_REFRESHED events in the new session are not blocked.
        clearLogoutMarker();

        // Source epic: Epic 2.10.
        // Source ticket: 2.10.T23 — a fresh login also clears the
        // deletion-terminal marker so the new session can refresh.
        clearDeletionTerminal();

        // Epic 2.9 / 2.9.T10 — wipe any stale "recently verified"
        // flags. A `LOGGED_IN` from another tab means the previous
        // session's verification is invalid for the new session
        // (different `userId`); even when the `userId` matches, the
        // local-tab flag was not tied to the broadcast-tab's
        // verify-password call, so it must not carry across.
        clearVerificationFlags();

        // Source epic: Epic 2.5.
        // Source ticket: TKT-2.5.7.
        //
        // A fresh login (whether same user re-logging in, or a new
        // user taking over this tab via cross-tab sync) must NOT
        // serve the previous session's SWR responses. Wipe every
        // key so the next render of any mounted consumer refetches
        // against the new auth context.
        void globalMutate(
          () => true,
          undefined,
          { revalidate: true },
        );

        setAuthToken(event.accessToken);
        break;
      }

      case 'ACCOUNT_DELETED': {
        // Source epic: Epic 2.10.
        // Source tickets: 2.10.T22 + 2.10.T23 + 2.10.T24.
        //
        // The originator tab has committed deletion. This tab must
        // converge on the deletion-terminal state without itself
        // issuing a DELETE request. The handler is dynamically
        // imported so the cross-tab receiver is a leaf module —
        // `custom-instance.ts` does not need to know about the
        // lifecycle primitives.
        void handleRemoteAccountDeleted(event);
        break;
      }
    }
  });

  // ─── T17 — Tab close during refresh ───────────────────────────────────────
  //
  // When the tab unloads, sever our reference to any in-flight refresh
  // and tear down the cooldown so a future tab reopening starts clean.
  // The Promise itself is a closure on the network call — it cannot be
  // cancelled — but clearing `inFlightRefresh` prevents a *subsequent*
  // tab from mistakenly sharing its slot, which would be a different
  // bug entirely. (Different module instance anyway, but defense in
  // depth.)
  const handlePageHide = () => {
    // Sever all pending waiters
    cancelInFlightRefresh();
    // Tear down cooldown so re-mounting the module doesn't start in cooldown
    clearCooldown();
  };

  // `pagehide` is the modern, recommended unload signal:
  //   - Fires for both regular navigations and frozen tabs (mobile)
  //   - Fires reliably when the page is unloaded by the user or browser
  // `beforeunload` is the fallback for very old browsers and to catch
  //   user-initiated unloads that don't trigger pagehide on some platforms.
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
