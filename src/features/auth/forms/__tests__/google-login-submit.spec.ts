

import { describe, expect, it, vi } from "vitest";

import { googleLoginSubmit } from "../google-login-submit";
import type { AuthControllerGoogleLoginResult } from "@/lib/api/generated/auth/auth";
import type { GoogleLoginSubmitDeps } from "../google-login-submit";
import type { ClearAuthTokenFn } from "@/features/auth/utils/auth-cookies";

import type { LoginResponseDto } from "@/lib/api/generated/schemas/loginResponseDto";

function makeLoginResponse(
overrides: Partial<LoginResponseDto> = {},
): LoginResponseDto {
return {
userId: "user-123",
username: "testuser",
email: "test@example.com",
accessToken: "access-token-abc",
sessionId: "session-123",
...overrides,
  };
}

function makeSuccessResult(
payload: LoginResponseDto = makeLoginResponse(),
): AuthControllerGoogleLoginResult {

return payload as unknown as AuthControllerGoogleLoginResult;
}

function makeStubGoogleLogin(
result: AuthControllerGoogleLoginResult,
): (idToken: string) => Promise<AuthControllerGoogleLoginResult> {
return vi.fn().mockResolvedValue(result);
}

function makeStubClearAuthToken() {
return vi.fn();
}

function asDeps(deps: {
googleLogin: (idToken: string) => Promise<AuthControllerGoogleLoginResult>;
clearAuthToken: ReturnType<typeof vi.fn>;
}): GoogleLoginSubmitDeps {
return {
googleLogin: deps.googleLogin,
clearAuthToken: deps.clearAuthToken as unknown as ClearAuthTokenFn,
  };
}

describe("googleLoginSubmit", () => {
describe("success path", () => {
it('returns { kind: "success", user } on success', async () => {
const payload = makeLoginResponse();
const deps = asDeps({
googleLogin: makeStubGoogleLogin(makeSuccessResult(payload)),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("valid-google-token", deps);

expect(result.kind).toBe("success");
if (result.kind === "success") {
expect(result.user).toEqual(payload);
      }
    });

it("clearAuthToken is NOT called by googleLoginSubmit itself", async () => {

const clearAuthTokenMock = makeStubClearAuthToken();
const deps = asDeps({
googleLogin: makeStubGoogleLogin(makeSuccessResult()),
clearAuthToken: clearAuthTokenMock,
      });

await googleLoginSubmit("valid-google-token", deps);

expect(clearAuthTokenMock.mock.calls.length).toBe(0);
    });

it("passes idToken to googleLogin", async () => {
const idToken = "my-google-id-token-123";
const deps = asDeps({
googleLogin: makeStubGoogleLogin(makeSuccessResult()),
clearAuthToken: makeStubClearAuthToken(),
      });

await googleLoginSubmit(idToken, deps);

expect(deps.googleLogin).toHaveBeenCalledWith(idToken);
    });

it("returns correct user data shape", async () => {
const payload = makeLoginResponse({
userId: "user-456",
email: "different@example.com",
      });
const deps = asDeps({
googleLogin: makeStubGoogleLogin(makeSuccessResult(payload)),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("token", deps);

if (result.kind === "success") {

const data = result.user as unknown as LoginResponseDto;
expect(data.userId).toBe("user-456");
expect(data.email).toBe("different@example.com");
      } else {
throw new Error("Expected success");
      }
    });
  });

describe("error path — oauth-specific errors", () => {
it("AUTH_OAUTH_INVALID_TOKEN → invalid_token", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue({
code: "AUTH_OAUTH_INVALID_TOKEN",
status: 401,
isValidationError: false,
isServerError: false,
validationMessages: [],
        }),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("expired-token", deps);

expect(result.kind).toBe("error");
expect((result as { kind: "error"; errorKind: string }).errorKind).toBe(
"invalid_token",
      );
    });

it("AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS → account_conflict", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue({
code: "AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS",
status: 409,
isValidationError: false,
isServerError: false,
validationMessages: [],
        }),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
expect((result as { kind: "error"; errorKind: string }).errorKind).toBe(
"account_conflict",
      );
    });

it("AUTH_OAUTH_LINKING_REQUIRED → linking_required", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue({
code: "AUTH_OAUTH_LINKING_REQUIRED",
status: 400,
isValidationError: false,
isServerError: false,
validationMessages: [],
        }),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
expect((result as { kind: "error"; errorKind: string }).errorKind).toBe(
"linking_required",
      );
    });
  });

describe("error path — retryable errors", () => {
it("429 → retryable", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue({
code: "GLOBAL_RATE_LIMITED",
status: 429,
isValidationError: false,
isServerError: false,
validationMessages: [],
        }),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
expect((result as { kind: "error"; errorKind: string }).errorKind).toBe(
"retryable",
      );
    });

it("5xx → retryable", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue({
code: "GLOBAL_INTERNAL_ERROR",
status: 500,
isValidationError: false,
isServerError: true,
validationMessages: [],
        }),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
expect((result as { kind: "error"; errorKind: string }).errorKind).toBe(
"retryable",
      );
    });

it("network error → retryable", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue({
code: "",
status: 0,
isValidationError: false,
isServerError: false,
validationMessages: [],
        }),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
expect((result as { kind: "error"; errorKind: string }).errorKind).toBe(
"retryable",
      );
    });

it("unknown error → retryable", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue(new Error("unexpected error")),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
expect((result as { kind: "error"; errorKind: string }).errorKind).toBe(
"retryable",
      );
    });
  });

describe("dependency injection", () => {
it("uses default deps when not provided", async () => {

const { defaultGoogleLoginSubmitDeps } =
await import("../google-login-submit");

expect(defaultGoogleLoginSubmitDeps).toBeDefined();
expect(typeof defaultGoogleLoginSubmitDeps.googleLogin).toBe("function");
expect(typeof defaultGoogleLoginSubmitDeps.clearAuthToken).toBe(
"function",
      );
    });

it("allows custom googleLogin implementation", async () => {
const customGoogleLogin = vi.fn().mockResolvedValue(makeSuccessResult());
const deps = asDeps({
googleLogin: customGoogleLogin,
clearAuthToken: makeStubClearAuthToken(),
      });

await googleLoginSubmit("custom-token", deps);

expect(customGoogleLogin).toHaveBeenCalledWith("custom-token");
    });
  });

describe("never rejects", () => {
it("rejects from googleLogin are swallowed and returned as error result", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue(new Error("network failure")),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
    });

it("returns result synchronously on thrown non-Error values", async () => {
const deps = asDeps({
googleLogin: vi.fn().mockRejectedValue("string error"),
clearAuthToken: makeStubClearAuthToken(),
      });

const result = await googleLoginSubmit("any-token", deps);

expect(result.kind).toBe("error");
    });
  });
});
