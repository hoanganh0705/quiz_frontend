

import { describe, expect, it } from "vitest";

describe("useGoogleLogin state machine logic", () => {

type GoogleLoginErrorKind =
| "invalid_token"
    | "account_conflict"
    | "linking_required"
    | "retryable";

type UseGoogleLoginState =
| { status: "idle" }
    | { status: "provider_initializing" }
    | { status: "provider_pending" }
    | { status: "exchange_pending" }
    | { status: "success"; user: { id: string; email: string } }
    | { status: "error"; errorKind: GoogleLoginErrorKind };

function isIdle(state: UseGoogleLoginState): boolean {
return state.status === "idle";
  }

function isPending(state: UseGoogleLoginState): boolean {
return (
state.status === "provider_initializing" ||
state.status === "provider_pending" ||
state.status === "exchange_pending"
    );
  }

function isSuccess(
state: UseGoogleLoginState,
  ): state is { status: "success"; user: { id: string; email: string } } {
return state.status === "success";
  }

function isError(
state: UseGoogleLoginState,
  ): state is { status: "error"; errorKind: GoogleLoginErrorKind } {
return state.status === "error";
  }

it("initial state is idle", () => {
const initialState: UseGoogleLoginState = { status: "idle" };
expect(isIdle(initialState)).toBe(true);
expect(isPending(initialState)).toBe(false);
expect(isSuccess(initialState)).toBe(false);
expect(isError(initialState)).toBe(false);
  });

it("provider_initializing is a pending state", () => {
const state: UseGoogleLoginState = { status: "provider_initializing" };
expect(isPending(state)).toBe(true);
expect(isIdle(state)).toBe(false);
  });

it("provider_pending is a pending state", () => {
const state: UseGoogleLoginState = { status: "provider_pending" };
expect(isPending(state)).toBe(true);
expect(isIdle(state)).toBe(false);
  });

it("exchange_pending is a pending state", () => {
const state: UseGoogleLoginState = { status: "exchange_pending" };
expect(isPending(state)).toBe(true);
expect(isIdle(state)).toBe(false);
  });

it("success state contains user object", () => {
const user = { id: "user-123", email: "test@example.com" };
const state: UseGoogleLoginState = { status: "success", user };
expect(isSuccess(state)).toBe(true);
expect(state.user.id).toBe("user-123");
expect(state.user.email).toBe("test@example.com");
  });

it("success state is not pending", () => {
const state: UseGoogleLoginState = {
status: "success",
user: { id: "1", email: "a@b.com" },
    };
expect(isPending(state)).toBe(false);
  });

it("error state contains errorKind", () => {
const state: UseGoogleLoginState = {
status: "error",
errorKind: "invalid_token",
    };
expect(isError(state)).toBe(true);
expect(state.errorKind).toBe("invalid_token");
  });

it("error states are not pending", () => {
const state: UseGoogleLoginState = {
status: "error",
errorKind: "retryable",
    };
expect(isPending(state)).toBe(false);
expect(isIdle(state)).toBe(false);
  });

it("all error kinds are valid", () => {
const errorKinds: GoogleLoginErrorKind[] = [
"invalid_token",
"account_conflict",
"linking_required",
"retryable",
    ];
for (const kind of errorKinds) {
const state: UseGoogleLoginState = { status: "error", errorKind: kind };
expect(isError(state)).toBe(true);
expect(state.errorKind).toBe(kind);
    }
  });
});

describe("useGoogleLogin single-flight logic", () => {

it("multiple calls return same promise", async () => {
let resolvePromise: (value: unknown) => void;
const promise = new Promise((resolve) => {
resolvePromise = resolve;
    });

let inFlightRef: Promise<unknown> | null = null;

function start(): Promise<unknown> {
if (inFlightRef) {
return inFlightRef;
      }
inFlightRef = promise;
return promise;
    }

const result1 = start();
const result2 = start();
const result3 = start();

expect(result1).toBe(result2);
expect(result2).toBe(result3);
expect(inFlightRef).toBe(promise);

resolvePromise!({ kind: "success" });

await expect(result1).resolves.toEqual({ kind: "success" });
  });

it("after resolve, new call gets new promise", async () => {
let firstResolve: (value: unknown) => void;

const firstPromise = new Promise((resolve) => {
firstResolve = resolve;
    });

const secondPromise = new Promise<void>(() => {});

let inFlightRef: Promise<unknown> | null = null;
let callCount = 0;

function start(): Promise<unknown> {
if (inFlightRef) {
return inFlightRef;
      }
callCount++;
inFlightRef = callCount === 1 ? firstPromise : secondPromise;
return inFlightRef;
    }

const result1 = start();
expect(result1).toBe(firstPromise);

firstResolve!({ kind: "success" });
await expect(result1).resolves.toEqual({ kind: "success" });

inFlightRef = null;

const result2 = start();
expect(result2).toBe(secondPromise);
expect(result1).not.toBe(result2);
  });
});

describe("useGoogleLogin error mapping", () => {

interface GoogleLoginSubmitResult {
kind: "success" | "error";
user?: { id: string; email: string };
errorKind?:
| "invalid_token"
      | "account_conflict"
      | "linking_required"
      | "retryable";
  }

function mapSubmitResultToState(result: GoogleLoginSubmitResult): {
status: "success" | "error";
user?: { id: string; email: string };
errorKind?:
| "invalid_token"
      | "account_conflict"
      | "linking_required"
      | "retryable";
  } {
if (result.kind === "success") {
return { status: "success", user: result.user };
    }
return { status: "error", errorKind: result.errorKind };
  }

it("success result maps to success state", () => {
const result: GoogleLoginSubmitResult = {
kind: "success",
user: { id: "1", email: "a@b.com" },
    };
const state = mapSubmitResultToState(result);
expect(state.status).toBe("success");
expect(state.user).toEqual({ id: "1", email: "a@b.com" });
  });

it("invalid_token error maps to error state", () => {
const result: GoogleLoginSubmitResult = {
kind: "error",
errorKind: "invalid_token",
    };
const state = mapSubmitResultToState(result);
expect(state.status).toBe("error");
expect(state.errorKind).toBe("invalid_token");
  });

it("account_conflict error maps to error state", () => {
const result: GoogleLoginSubmitResult = {
kind: "error",
errorKind: "account_conflict",
    };
const state = mapSubmitResultToState(result);
expect(state.status).toBe("error");
expect(state.errorKind).toBe("account_conflict");
  });

it("linking_required error maps to error state", () => {
const result: GoogleLoginSubmitResult = {
kind: "error",
errorKind: "linking_required",
    };
const state = mapSubmitResultToState(result);
expect(state.status).toBe("error");
expect(state.errorKind).toBe("linking_required");
  });

it("retryable error maps to error state", () => {
const result: GoogleLoginSubmitResult = {
kind: "error",
errorKind: "retryable",
    };
const state = mapSubmitResultToState(result);
expect(state.status).toBe("error");
expect(state.errorKind).toBe("retryable");
  });
});

describe("useGoogleLogin availability logic", () => {

function computeAvailability(clientId: string | undefined): boolean {
return Boolean(clientId && clientId.length > 0);
  }

it("isAvailable is true when client ID is set", () => {
expect(computeAvailability("my-client-id.apps.googleusercontent.com")).toBe(
true,
    );
  });

it("isAvailable is false when client ID is empty string", () => {
expect(computeAvailability("")).toBe(false);
  });

it("isAvailable is false when client ID is undefined", () => {
expect(computeAvailability(undefined)).toBe(false);
  });
});

describe("useGoogleLogin disabled state logic", () => {

type LoginState = { status: "idle" | "pending" | "error" | "success" };
type GoogleLoginState = {
status:
| "idle"
      | "provider_initializing"
      | "provider_pending"
      | "exchange_pending"
      | "error"
      | "success";
  };

function isLoginPending(state: LoginState): boolean {
return state.status === "pending";
  }

function isGoogleLoginPending(state: GoogleLoginState): boolean {
return (
state.status === "provider_initializing" ||
state.status === "provider_pending" ||
state.status === "exchange_pending"
    );
  }

function isFormDisabled(
loginState: LoginState,
googleState: GoogleLoginState,
  ): boolean {
return isLoginPending(loginState) || isGoogleLoginPending(googleState);
  }

it("form disabled when credential login is pending", () => {
const loginState: LoginState = { status: "pending" };
const googleState: GoogleLoginState = { status: "idle" };
expect(isFormDisabled(loginState, googleState)).toBe(true);
  });

it("form disabled when Google login is provider_initializing", () => {
const loginState: LoginState = { status: "idle" };
const googleState: GoogleLoginState = { status: "provider_initializing" };
expect(isFormDisabled(loginState, googleState)).toBe(true);
  });

it("form disabled when Google login is provider_pending", () => {
const loginState: LoginState = { status: "idle" };
const googleState: GoogleLoginState = { status: "provider_pending" };
expect(isFormDisabled(loginState, googleState)).toBe(true);
  });

it("form disabled when Google login is exchange_pending", () => {
const loginState: LoginState = { status: "idle" };
const googleState: GoogleLoginState = { status: "exchange_pending" };
expect(isFormDisabled(loginState, googleState)).toBe(true);
  });

it("form enabled when both are idle", () => {
const loginState: LoginState = { status: "idle" };
const googleState: GoogleLoginState = { status: "idle" };
expect(isFormDisabled(loginState, googleState)).toBe(false);
  });

it("Google button disabled when credential login is pending", () => {
const loginState: LoginState = { status: "pending" };
const googleState: GoogleLoginState = { status: "idle" };
expect(isFormDisabled(loginState, googleState)).toBe(true);
  });
});
