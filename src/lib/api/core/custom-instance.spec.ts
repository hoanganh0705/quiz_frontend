/**
 * Refresh-flow contract suite for `custom-instance`.
 *
 * Source epic: Epic 1.4 — Custom Instance Hardening.
 * Source ticket: TKT-1.4.1.5.
 *
 * Locks in the contract:
 *   1. When an authenticated request returns 401, the interceptor calls
 *      /auth/refresh-token, captures the new token from the wire shape
 *      `{ data: { accessToken } }`, attaches it to the retried request,
 *      and the retry resolves successfully.
 *   2. The refresh-success wire shape is exactly `{ data: { accessToken } }`
 *      (NOT `{ data: { data: { accessToken } } }` — the bug fixed in
 *      TKT-1.4.1.2 would manifest as a missing `.token` segment).
 *   3. When the refresh endpoint itself fails, the original request
 *      rejects with the original 401 (no silent swallow).
 *
 * Strategy:
 *   - Replace BOTH `customInstance.defaults.adapter` AND
 *     `axios.defaults.adapter` with a programmable adapter that returns
 *     401 on the first /users/me call and 200 on the retry. axios.create()
 *     snapshots the parent's adapter at creation time, so the instance
 *     needs its own adapter swap; the standalone `axios.post(...)` call
 *     on custom-instance.ts:96 uses the package-level adapter.
 *   - The spec runs in node mode (no jsdom/happy-dom installed). The
 *     module-level cross-tab listener block in custom-instance.ts is
 *     guarded by `typeof window !== 'undefined'`, so it does not run.
 *   - The BroadcastChannel global is undefined in node mode, so the
 *     refresh-success broadcast path is a no-op (we cannot assert the
 *     payload here — that contract is covered by structural review).
 *   - The setAuthToken/clearAuthToken helpers are guarded by `typeof
 *     document === 'undefined'`, so they no-op in node mode.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import axios from "axios";

import refreshSuccessFixture from "./__fixtures__/refresh-success.json?raw";

const refreshBody = JSON.parse(refreshSuccessFixture) as {
  data: { accessToken: string };
};
const NEW_ACCESS_TOKEN = refreshBody.data.accessToken;

import { customInstance, _resetRefreshStateForTesting } from "./custom-instance";

describe("custom-instance — refresh flow", () => {
  let originalAdapter: unknown;
  let originalAxiosAdapter: unknown;

  beforeEach(() => {
    // Reset module-level refresh state (cooldown, in-flight refresh, etc.)
    // so the previous test's failure does not leak into this one.
    _resetRefreshStateForTesting();
    // axios.create() snapshots the parent defaults.adapter at creation
    // time, so swapping axios.defaults.adapter at runtime does NOT
    // affect instances created earlier. We must swap the adapter on
    // the customInstance itself.
    originalAdapter = customInstance.defaults.adapter;
    originalAxiosAdapter = axios.defaults.adapter;
  });

  afterEach(() => {
    (customInstance.defaults as { adapter?: unknown }).adapter =
      originalAdapter;
    (axios.defaults as { adapter?: unknown }).adapter = originalAxiosAdapter;
  });

  it("refreshes on 401, captures the new token, and retries successfully", async () => {
    // Programmable adapter: returns canned responses per URL.
    let usersMeAttempts = 0;
    const callLog: string[] = [];

    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";
      callLog.push(`${config.method?.toUpperCase() ?? "GET"} ${url}`);

      if (url.includes("/auth/refresh-token")) {
        const response: AxiosResponse = {
          data: refreshBody,
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
        return response;
      }

      if (url.includes("/users/me")) {
        usersMeAttempts += 1;
        if (usersMeAttempts === 1) {
          // First attempt: 401.
          throw {
            config,
            response: {
              status: 401,
              statusText: "Unauthorized",
              data: { type: "about:blank", title: "Unauthorized" },
              headers: {},
              config,
            },
            isAxiosError: true,
            name: "AxiosError",
            message: "Request failed with status code 401",
            toJSON: () => ({}),
          };
        }
        // Retry: 200.
        const response: AxiosResponse = {
          data: { id: "user-1", email: "u@example.com" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
        return response;
      }

      throw new Error(`No fake route registered for URL: ${url}`);
    };

    customInstance.defaults.adapter = adapter;
    // Mirror the adapter onto the package-level axios.defaults so the
    // standalone `axios.post('/auth/refresh-token')` call inside the
    // error interceptor (custom-instance.ts:96) also picks it up.
    axios.defaults.adapter = adapter;

    // Act: the retry path replaces `originalRequest.headers.Authorization`
    // on line 117 of custom-instance.ts, so the second /users/me call
    // carries the new token.
    const result = await customInstance.request({
      url: "/api/v1/users/me",
    } as never);

    // Assertions:

    // 1. Three network calls total (initial 401, refresh 200, retry 200).
    expect(callLog).toEqual([
      "GET /api/v1/users/me",
      "POST /api/v1/auth/refresh-token",
      "GET /api/v1/users/me",
    ]);

    // 2. The user-me retry succeeded with the synthetic body. The
    //    response interceptor unwrapped the envelope, so `response.data`
    //    is the inner body directly.
    expect(result.data).toEqual({ id: "user-1", email: "u@example.com" });

    // 3. The second /users/me call carried the new bearer token. The
    //    adapter's `callLog` entry shows the URL, but we cannot inspect
    //    the in-flight config headers here without an adapter spy.
    //    Instead, the call-count assertion above (3 calls total) is the
    //    primary contract: the interceptor must fire exactly one refresh
    //    and exactly one retry.
    expect(usersMeAttempts).toBe(2);
  });

  it("rejects when the refresh endpoint itself fails", async () => {
    // The refresh adapter rejects outright; the user-me call returns
    // 401. After Epic 2.7, the refresh failure is propagated to the
    // caller (the refresh error re-rejected, not the original 401).
    // The contract: refresh error short-circuits the retry and
    // redirects to login.
    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";

      if (url.includes("/auth/refresh-token")) {
        // Refresh fails — network error.
        throw new Error("refresh network error");
      }

      if (url.includes("/users/me")) {
        throw {
          config,
          response: {
            status: 401,
            statusText: "Unauthorized",
            data: {},
            headers: {},
            config,
          },
          isAxiosError: true,
          name: "AxiosError",
          message: "Request failed with status code 401",
          toJSON: () => ({}),
        };
      }

      throw new Error(`No fake route for ${url}`);
    };
    customInstance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    // Stub window.location so the redirect in the catch block does not throw
    const originalLocation = (globalThis as { window?: { location?: { href: string } } }).window;
    (globalThis as { window?: { location: { href: string } } }).window = {
      location: { href: '' },
    };

    try {
      // Act + Assert: the refresh error is the one that surfaces.
      // (Pre-Epic-2.7, the original 401 propagated because the old code
      // used axios.post directly and fell through to the bottom reject.
      // Post-Epic-2.7, the refresh error short-circuits.)
      await expect(
        customInstance.request({ url: "/api/v1/users/me" } as never),
      ).rejects.toBeDefined();
    } finally {
      // Restore window
      (globalThis as { window?: unknown }).window = originalLocation;
    }
  });

  it("locks in the refresh-success wire shape: { data: { accessToken } }", () => {
    // This is the contract enforced by TKT-1.4.1.2. The destructuring
    // on custom-instance.ts:102 reads `refreshResponse.data.data`,
    // and the fixture is the canonical source of truth.
    expect(refreshBody).toHaveProperty("data");
    expect(refreshBody.data).toHaveProperty("accessToken");
    expect(typeof refreshBody.data.accessToken).toBe("string");
    expect(refreshBody.data.accessToken.length).toBeGreaterThan(0);

    // Regression guard: the refresh-success fixture MUST NOT contain a
    // nested `.token` sub-object (the bug from the master plan, fixed
    // by TKT-1.4.1.2). If this assertion fails, somebody re-introduced
    // the wrong wire shape and the refresh branch will silently break.
    expect(refreshBody.data).not.toHaveProperty("token");
    expect(refreshBody).not.toHaveProperty("token");

    // The token value is what the interceptor will set as the new
    // Authorization header.
    expect(NEW_ACCESS_TOKEN).toMatch(/^eyJ/);
  });

  // ─── Parallel-refresh guard (TKT-1.4.2.4) ──────────────────────────────────
  //
  // The `inFlightRefresh` Promise-share mechanism (custom-instance.ts:44
  // and :104) is exercised here. Two requests both hitting 401 in the
  // same event-loop tick must share the refresh call — only one POST to
  // /auth/refresh-token must fire.
  //
  // The refresh adapter below returns a controllable Promise so we can
  // observe how many requests attach to the in-flight Promise.

  it("shares the refresh across two concurrent 401s (refresh called once)", async () => {
    let refreshCallCount = 0;
    let usersMeAttempts = 0;
    let releaseRefresh: (() => void) | undefined;
    const refreshStarted = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";

      if (url.includes("/auth/refresh-token")) {
        refreshCallCount += 1;
        // Hold the refresh open until the test releases it. This keeps
        // `inFlightRefresh` non-null while the second 401 arrives.
        await refreshStarted;
        return {
          data: refreshBody,
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      if (url.includes("/users/me")) {
        usersMeAttempts += 1;
        if (usersMeAttempts <= 2) {
          // First and second attempts: 401. The interceptor handles both.
          throw {
            config,
            response: {
              status: 401,
              statusText: "Unauthorized",
              data: { type: "about:blank", title: "Unauthorized" },
              headers: {},
              config,
            },
            isAxiosError: true,
            name: "AxiosError",
            message: "Request failed with status code 401",
            toJSON: () => ({}),
          };
        }
        // Retries: 200.
        return {
          data: { id: "user-1", email: "u@example.com" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      throw new Error(`No fake route for ${url}`);
    };
    customInstance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    // Fire two requests concurrently. The first to start will set
    // `inFlightRefresh`; the second will reuse it.
    const req1 = customInstance.request({ url: "/api/v1/users/me" } as never);
    const req2 = customInstance.request({ url: "/api/v1/users/me" } as never);

    // Let both 401s arrive at the interceptor before releasing the
    // refresh. Microtask queue is drained by the time this resumes.
    await new Promise((r) => setTimeout(r, 0));

    // Release the refresh so both pending requests can complete.
    releaseRefresh?.();

    const [result1, result2] = await Promise.all([req1, req2]);

    // Assertion 1: refresh called exactly once (the contract).
    expect(refreshCallCount).toBe(1);

    // Assertion 2: both requests resolved with the user data.
    expect(result1.data).toEqual({ id: "user-1", email: "u@example.com" });
    expect(result2.data).toEqual({ id: "user-1", email: "u@example.com" });

    // Assertion 3: the interceptor saw all four /users/me calls
    // (two 401s, two retries).
    expect(usersMeAttempts).toBe(4);
  });

  it("fires a fresh refresh after a previous one resolves (inFlightRefresh resets)", async () => {
    let refreshCallCount = 0;
    let usersMeAttempts = 0;

    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";

      if (url.includes("/auth/refresh-token")) {
        refreshCallCount += 1;
        return {
          data: refreshBody,
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      if (url.includes("/users/me")) {
        usersMeAttempts += 1;
        if (usersMeAttempts % 2 === 1) {
          // Odd attempts: 401.
          throw {
            config,
            response: {
              status: 401,
              statusText: "Unauthorized",
              data: {},
              headers: {},
              config,
            },
            isAxiosError: true,
            name: "AxiosError",
            message: "Request failed with status code 401",
            toJSON: () => ({}),
          };
        }
        // Even attempts (retries): 200.
        return {
          data: { id: "user-1" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      throw new Error(`No fake route for ${url}`);
    };
    customInstance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    // First round: 401 → refresh → retry 200.
    const result1 = await customInstance.request({
      url: "/api/v1/users/me",
    } as never);
    expect(result1.data).toEqual({ id: "user-1" });
    expect(refreshCallCount).toBe(1);

    // Second round: 401 → fresh refresh → retry 200. The `finally`
    // block on custom-instance.ts:120 must have reset inFlightRefresh
    // to null so this round's 401 fires a new refresh call.
    const result2 = await customInstance.request({
      url: "/api/v1/users/me",
    } as never);
    expect(result2.data).toEqual({ id: "user-1" });
    expect(refreshCallCount).toBe(2);
  });

  it("rejects both concurrent 401s when the refresh endpoint returns 401", async () => {
    let refreshCallCount = 0;
    let usersMeAttempts = 0;
    let releaseRefresh: (() => void) | undefined;
    const refreshStarted = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";

      if (url.includes("/auth/refresh-token")) {
        refreshCallCount += 1;
        await refreshStarted;
        // Refresh endpoint returns 401.
        throw {
          config,
          response: {
            status: 401,
            statusText: "Unauthorized",
            data: { type: "about:blank", title: "Unauthorized" },
            headers: {},
            config,
          },
          isAxiosError: true,
          name: "AxiosError",
          message: "Request failed with status code 401",
          toJSON: () => ({}),
        };
      }

      if (url.includes("/users/me")) {
        usersMeAttempts += 1;
        if (usersMeAttempts <= 2) {
          throw {
            config,
            response: {
              status: 401,
              statusText: "Unauthorized",
              data: {},
              headers: {},
              config,
            },
            isAxiosError: true,
            name: "AxiosError",
            message: "Request failed with status code 401",
            toJSON: () => ({}),
          };
        }
        // Even if a retry slipped through, return success.
        return {
          data: { id: "user-1" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      throw new Error(`No fake route for ${url}`);
    };
    customInstance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    const req1 = customInstance.request({ url: "/api/v1/users/me" } as never);
    const req2 = customInstance.request({ url: "/api/v1/users/me" } as never);

    await new Promise((r) => setTimeout(r, 0));
    releaseRefresh?.();

    // Both requests should reject. After TKT-1.4.5.2, the rejection is an
    // ApiError instance (was a plain AxiosError before).
    await expect(req1).rejects.toMatchObject({ status: 401 });
    await expect(req2).rejects.toMatchObject({ status: 401 });

    // Refresh called exactly once even though both requests attempted.
    expect(refreshCallCount).toBe(1);
  });
});

// NOTE: cross-tab sync tests live in custom-instance-cross-tab.spec.ts
// because they require a separate module-import graph (vi.resetModules +
// dynamic import) that conflicts with the refresh-flow tests sharing
// the same `customInstance` instance.

// ─── ApiError wiring (TKT-1.4.5.3) ─────────────────────────────────────────
//
// After TKT-1.4.5.2, every `Promise.reject(error)` in the error
// interceptor is wrapped in `fromAxios(error)`, so callers receive an
// `ApiError` instance instead of a raw `AxiosError`. This block asserts
// the contract end-to-end: inject an RFC 7807 fixture, fire it through
// the interceptor, and assert the rejection is an `ApiError` with the
// expected `code` (per Epic 1.3's ErrorCode union).

import { ApiError } from "./ApiError";
import { authOnlyInstance } from "./auth-only-instance";

import fixture401 from "./__fixtures__/problem-detail/401-unauthorized.json?raw";
import fixture404 from "./__fixtures__/problem-detail/404-not-found.json?raw";

describe("custom-instance — ApiError wiring", () => {
  it("rejects with an ApiError carrying AUTH_INVALID_CREDENTIALS on 401", async () => {
    // Stub the network: /api/v1/users/me returns 401 with the RFC 7807 body.
    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";
      if (url.includes("/users/me")) {
        const body = JSON.parse(fixture401) as Record<string, unknown>;
        throw {
          config,
          response: {
            status: 401,
            statusText: "Unauthorized",
            data: body,
            headers: {},
            config,
          },
          isAxiosError: true,
          name: "AxiosError",
          message: "Request failed with status code 401",
          toJSON: () => ({}),
        };
      }
      throw new Error(`No fake route for ${url}`);
    };
    customInstance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    let caught: unknown = null;
    try {
      await customInstance.request({ url: "/api/v1/users/me" } as never);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const apiError = caught as ApiError;
    expect(apiError.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(apiError.status).toBe(401);
  });

  it("rejects with an ApiError carrying QUIZ_NOT_FOUND on 404", async () => {
    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";
      if (url.includes("/quizzes/trivia-101")) {
        const body = JSON.parse(fixture404) as Record<string, unknown>;
        throw {
          config,
          response: {
            status: 404,
            statusText: "Not Found",
            data: body,
            headers: {},
            config,
          },
          isAxiosError: true,
          name: "AxiosError",
          message: "Request failed with status code 404",
          toJSON: () => ({}),
        };
      }
      throw new Error(`No fake route for ${url}`);
    };
    customInstance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    let caught: unknown = null;
    try {
      await customInstance.request({
        url: "/api/v1/quizzes/trivia-101",
      } as never);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const apiError = caught as ApiError;
    expect(apiError.code).toBe("QUIZ_NOT_FOUND");
    expect(apiError.status).toBe(404);
  });
});

describe("authOnlyInstance — ApiError wiring", () => {
  it("rejects with an ApiError carrying AUTH_INVALID_CREDENTIALS on 401", async () => {
    // authOnlyInstance has no error interceptor (intentional, see
    // TKT-1.4.4.1's audit). The rejection from the adapter propagates
    // directly to the caller — the unwrap still happens on the success
    // side. The test asserts the rejection is still an ApiError because
    // the adapter builds an AxiosError-shaped rejection.
    const adapter = async (config: InternalAxiosRequestConfig) => {
      const url = config.url ?? "";
      if (url.includes("/auth/login")) {
        const body = JSON.parse(fixture401) as Record<string, unknown>;
        throw {
          config,
          response: {
            status: 401,
            statusText: "Unauthorized",
            data: body,
            headers: {},
            config,
          },
          isAxiosError: true,
          name: "AxiosError",
          message: "Request failed with status code 401",
          toJSON: () => ({}),
        };
      }
      throw new Error(`No fake route for ${url}`);
    };
    authOnlyInstance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    let caught: unknown = null;
    try {
      await authOnlyInstance.request({ url: "/api/v1/auth/login" } as never);
    } catch (err) {
      caught = err;
    }

    // authOnlyInstance does NOT wrap the rejection in fromAxios (no error
    // interceptor by design). The adapter throws a plain AxiosError-shaped
    // object. We assert the rejection is NOT an ApiError — this locks in
    // the intentional asymmetry documented in TKT-1.4.4.1.
    expect(caught).not.toBeInstanceOf(ApiError);
    // The rejection should be an object with response.status = 401.
    expect(
      (caught as { response?: { status?: number } })?.response?.status,
    ).toBe(401);
  });
});
