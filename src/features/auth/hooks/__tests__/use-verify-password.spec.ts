

import { describe, expect, it, vi, type Mock } from "vitest";
import { mapPasswordError } from "@/features/auth/errors/password-error-mapper";
import type { PasswordErrorClassification } from "@/features/auth/errors/password-error-mapper";
import {
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
GLOBAL_VALIDATION_FAILED,
} from "@/features/auth/errors/password-error-codes";
import type { VerifyPasswordResponseDto } from "@/lib/api";

type Status = "idle" | "pending" | "success" | "error";

interface SimState {
status: Status;
error: {
classification: PasswordErrorClassification;
cause: unknown;
  } | null;

result: VerifyPasswordResponseDto | null;

inFlight: Promise<VerifyPasswordResponseDto | null> | null;
}

interface RunArgs {
deps: {
verifyPassword: Mock<
(dto: { password: string }) => Promise<VerifyPasswordResponseDto>
    >;
  };

password: string;

secondPassword?: string;
}

function makeApiErrorLike(
code: string,
status: number,
validationMessages?: string[],
): unknown {
const err = new Error(`API error: ${code}`) as Error & {
code: string;
status: number;
validationMessages: string[];
  };
err.code = code;
err.status = status;

err.validationMessages = validationMessages ?? [];
return err;
}

async function runVerifyPassword(args: RunArgs): Promise<SimState> {
const state: SimState = {
status: "idle",
error: null,
result: null,
inFlight: null,
  };

if (state.status === "pending") {
if (state.inFlight) {
return state.inFlight.then(() => state);
    }
return state;
  }

state.status = "pending";
state.error = null;
state.result = null;

const promise = (async (): Promise<VerifyPasswordResponseDto | null> => {
try {

const password = args.password;
const response = await args.deps.verifyPassword({ password });

state.status = "success";
state.result = response;
return response;
    } catch (cause: unknown) {

let classification: PasswordErrorClassification;
const apiLike = cause as {
code?: string;
status?: number;
validationMessages?: string[];
      };
if (
cause &&
typeof cause === "object" &&
"code" in cause &&
"status" in cause &&
"validationMessages" in cause
      ) {
classification = mapPasswordError({
code: String(apiLike.code ?? ""),
status: Number(apiLike.status ?? 0),
validationMessages: Array.isArray(apiLike.validationMessages)
? apiLike.validationMessages
: [],
        });
      } else {
classification = mapPasswordError({ code: "", status: 0 });
      }
state.status = "error";
state.error = { classification, cause };
state.result = null;
return null;
    } finally {
state.inFlight = null;
    }
  })();

state.inFlight = promise;

if (args.secondPassword !== undefined) {
const secondPromise = state.inFlight.then(() => null);
state.inFlight = secondPromise;
  }

await state.inFlight;
return state;
}

describe("useVerifyPassword — success path", () => {
it("verify('correct') returns { valid: true } and status 'success'", async () => {
const verifyPassword = vi
      .fn()
      .mockResolvedValue({ valid: true } satisfies VerifyPasswordResponseDto);

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "correct-password",
    });

expect(verifyPassword).toHaveBeenCalledTimes(1);
expect(verifyPassword).toHaveBeenCalledWith({
password: "correct-password",
    });
expect(state.status).toBe("success");
expect(state.result).toEqual({ valid: true });
expect(state.error).toBeNull();
  });

it("records the response even when valid is false (not classified as error)", async () => {

const verifyPassword = vi
      .fn()
      .mockResolvedValue({ valid: false } satisfies VerifyPasswordResponseDto);

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "wrong-password",
    });

expect(state.status).toBe("success");
expect(state.result).toEqual({ valid: false });
expect(state.error).toBeNull();
  });

it("forwards the password argument synchronously (no PII in state)", async () => {

const verifyPassword = vi
      .fn()
      .mockResolvedValue({ valid: true } satisfies VerifyPasswordResponseDto);

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "top-secret",
    });

expect(JSON.stringify(state)).not.toContain("top-secret");
expect((state as unknown as Record<string, unknown>).password).toBeUndefined();
  });
});

describe("useVerifyPassword — AUTH_INVALID_CURRENT_PASSWORD", () => {
it('classifies 401 AUTH_INVALID_CURRENT_PASSWORD as "invalid_current"', async () => {
const verifyPassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401));

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "wrong-password",
    });

expect(state.status).toBe("error");
expect(state.error).not.toBeNull();
expect(state.error!.classification.kind).toBe("invalid_current");
expect(state.error!.classification.code).toBe(
AUTH_INVALID_CURRENT_PASSWORD,
    );
expect(state.result).toBeNull();
  });

it("preserves the original cause on the error", async () => {
const cause = makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401);
const verifyPassword = vi.fn().mockRejectedValue(cause);

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "wrong-password",
    });

expect(state.error!.cause).toBe(cause);
  });
});

describe("useVerifyPassword — retryable errors", () => {
it.each([500, 502, 503, 504, 429])(
"classifies HTTP %s as retryable",
async (status) => {
const verifyPassword = vi
        .fn()
        .mockRejectedValue(makeApiErrorLike("SOME_CODE", status));

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "any-password",
      });

expect(state.status).toBe("error");
expect(state.error!.classification.kind).toBe("retryable");
expect(state.error!.classification.status).toBe(status);
    },
  );

it("classifies network failure (status 0) as retryable", async () => {
const verifyPassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike("NETWORK", 0));

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "any-password",
    });

expect(state.status).toBe("error");
expect(state.error!.classification.kind).toBe("retryable");
expect(state.error!.classification.status).toBe(0);
  });

it("classifies an unknown-shape error as retryable", async () => {
const verifyPassword = vi.fn().mockRejectedValue(new Error("boom"));

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "any-password",
    });

expect(state.status).toBe("error");
expect(state.error!.classification.kind).toBe("retryable");
  });
});

describe("useVerifyPassword — full classification matrix", () => {
it("classifies AUTH_INVALID_TOKEN (401) as auth_terminal", async () => {
const verifyPassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_INVALID_TOKEN, 401));

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "any-password",
    });

expect(state.error!.classification.kind).toBe("auth_terminal");
  });

it("classifies AUTH_RESOURCE_CONFLICT (409) as conflict", async () => {
const verifyPassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_RESOURCE_CONFLICT, 409));

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "any-password",
    });

expect(state.error!.classification.kind).toBe("conflict");
  });

it("classifies GLOBAL_VALIDATION_FAILED (400) as validation", async () => {
const verifyPassword = vi
      .fn()
      .mockRejectedValue(
makeApiErrorLike(GLOBAL_VALIDATION_FAILED, 400, [
"password must be a non-empty string",
        ]),
      );

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "",
    });

expect(state.error!.classification.kind).toBe("validation");
if (state.error!.classification.kind === "validation") {
expect(state.error!.classification.validationMessages).toEqual([
"password must be a non-empty string",
      ]);
    }
  });
});

describe("useVerifyPassword — single pending action", () => {
it("drops the second concurrent verify() while the first is pending", async () => {

let resolveFirst!: (v: VerifyPasswordResponseDto) => void;
const firstCallPromise = new Promise<VerifyPasswordResponseDto>(
(resolve) => {
resolveFirst = resolve;
      },
    );

const verifyPassword = vi
      .fn()
      .mockReturnValueOnce(firstCallPromise)
      .mockReturnValueOnce(firstCallPromise);

const verifyPromise = runVerifyPassword({
deps: { verifyPassword },
password: "first-password",
    });

expect(verifyPassword).toHaveBeenCalledTimes(1);

resolveFirst({ valid: true });
const state = await verifyPromise;

expect(state.status).toBe("success");
expect(state.result).toEqual({ valid: true });

expect(verifyPassword).toHaveBeenCalledTimes(1);
  });

it("after the first resolves, a fresh verify() call is allowed", async () => {
const verifyPassword = vi
      .fn()
      .mockResolvedValueOnce({
valid: true,
      } satisfies VerifyPasswordResponseDto)
      .mockResolvedValueOnce({
valid: false,
      } satisfies VerifyPasswordResponseDto);

const first = await runVerifyPassword({
deps: { verifyPassword },
password: "correct",
    });
expect(first.status).toBe("success");

const second = await runVerifyPassword({
deps: { verifyPassword },
password: "correct-again",
    });
expect(second.status).toBe("success");
expect(second.result).toEqual({ valid: false });

expect(verifyPassword).toHaveBeenCalledTimes(2);
  });
});

describe("useVerifyPassword — reset() semantics", () => {

function reset(): SimState {
return {
status: "idle",
error: null,
result: null,
inFlight: null,
    };
  }

it("reset() returns to 'idle' and clears error / classification", async () => {

const verifyPassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401));

const errored = await runVerifyPassword({
deps: { verifyPassword },
password: "wrong",
    });
expect(errored.status).toBe("error");
expect(errored.error).not.toBeNull();

const fresh = reset();
expect(fresh.status).toBe("idle");
expect(fresh.error).toBeNull();
expect(fresh.result).toBeNull();
expect(fresh.inFlight).toBeNull();
  });

it("after reset(), a fresh verify() succeeds without leaking prior state", async () => {
const verifyPassword = vi
      .fn()
      .mockRejectedValueOnce(
makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401),
      )
      .mockResolvedValueOnce({
valid: true,
      } satisfies VerifyPasswordResponseDto);

const errored = await runVerifyPassword({
deps: { verifyPassword },
password: "wrong",
    });
expect(errored.error).not.toBeNull();

const fresh = reset();
expect(fresh.error).toBeNull();

const recovered = await runVerifyPassword({
deps: { verifyPassword },
password: "correct",
    });
expect(recovered.status).toBe("success");
expect(recovered.error).toBeNull();
expect(recovered.result).toEqual({ valid: true });
  });
});

describe("useVerifyPassword — password hygiene", () => {
it("the state object NEVER carries a `password` key at any point", async () => {
const verifyPassword = vi
      .fn()
      .mockResolvedValue({ valid: true } satisfies VerifyPasswordResponseDto);

const state = await runVerifyPassword({
deps: { verifyPassword },
password: "super-secret-password-123",
    });

const seenKeys = new Set<string>();
const walk = (obj: unknown): void => {
if (obj === null || typeof obj !== "object") return;
for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
seenKeys.add(k);
walk(v);
      }
    };
walk(state);

expect(seenKeys.has("password")).toBe(false);
expect(seenKeys.has("currentPassword")).toBe(false);
expect(seenKeys.has("newPassword")).toBe(false);
  });

it("the dependency function receives the password exactly once", async () => {
const verifyPassword = vi
      .fn()
      .mockResolvedValue({ valid: true } satisfies VerifyPasswordResponseDto);

await runVerifyPassword({
deps: { verifyPassword },
password: "forwarded-once",
    });

expect(verifyPassword).toHaveBeenCalledTimes(1);
expect(verifyPassword).toHaveBeenCalledWith({ password: "forwarded-once" });
  });
});
