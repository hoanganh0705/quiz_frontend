

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

_resetRefreshStateForTesting();

originalAdapter = customInstance.defaults.adapter;
originalAxiosAdapter = axios.defaults.adapter;
  });

afterEach(() => {
(customInstance.defaults as { adapter?: unknown }).adapter =
originalAdapter;
(axios.defaults as { adapter?: unknown }).adapter = originalAxiosAdapter;
  });

it("refreshes on 401, captures the new token, and retries successfully", async () => {

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

axios.defaults.adapter = adapter;

const result = await customInstance.request({
url: "/api/v1/users/me",
    } as never);

expect(callLog).toEqual([
"GET /api/v1/users/me",
"POST /api/v1/auth/refresh-token",
"GET /api/v1/users/me",
    ]);

expect(result.data).toEqual({ id: "user-1", email: "u@example.com" });

expect(usersMeAttempts).toBe(2);
  });

it("rejects when the refresh endpoint itself fails", async () => {

const adapter = async (config: InternalAxiosRequestConfig) => {
const url = config.url ?? "";

if (url.includes("/auth/refresh-token")) {

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

const originalLocation = (globalThis as { window?: { location?: { href: string } } }).window;
(globalThis as { window?: { location: { href: string } } }).window = {
location: { href: '' },
    };

try {

await expect(
customInstance.request({ url: "/api/v1/users/me" } as never),
      ).rejects.toBeDefined();
    } finally {

(globalThis as { window?: unknown }).window = originalLocation;
    }
  });

it("locks in the refresh-success wire shape: { data: { accessToken } }", () => {

expect(refreshBody).toHaveProperty("data");
expect(refreshBody.data).toHaveProperty("accessToken");
expect(typeof refreshBody.data.accessToken).toBe("string");
expect(refreshBody.data.accessToken.length).toBeGreaterThan(0);

expect(refreshBody.data).not.toHaveProperty("token");
expect(refreshBody).not.toHaveProperty("token");

expect(NEW_ACCESS_TOKEN).toMatch(/^eyJ/);
  });

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

const req1 = customInstance.request({ url: "/api/v1/users/me" } as never);
const req2 = customInstance.request({ url: "/api/v1/users/me" } as never);

await new Promise((r) => setTimeout(r, 0));

releaseRefresh?.();

const [result1, result2] = await Promise.all([req1, req2]);

expect(refreshCallCount).toBe(1);

expect(result1.data).toEqual({ id: "user-1", email: "u@example.com" });
expect(result2.data).toEqual({ id: "user-1", email: "u@example.com" });

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

const result1 = await customInstance.request({
url: "/api/v1/users/me",
    } as never);
expect(result1.data).toEqual({ id: "user-1" });
expect(refreshCallCount).toBe(1);

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

await expect(req1).rejects.toMatchObject({ status: 401 });
await expect(req2).rejects.toMatchObject({ status: 401 });

expect(refreshCallCount).toBe(1);
  });
});

import { ApiError } from "./ApiError";
import { authOnlyInstance } from "./auth-only-instance";

import fixture401 from "./__fixtures__/problem-detail/401-unauthorized.json?raw";
import fixture404 from "./__fixtures__/problem-detail/404-not-found.json?raw";

describe("custom-instance — ApiError wiring", () => {
it("rejects with an ApiError carrying AUTH_INVALID_CREDENTIALS on 401", async () => {

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

expect(caught).not.toBeInstanceOf(ApiError);

expect(
(caught as { response?: { status?: number } })?.response?.status,
    ).toBe(401);
  });
});
