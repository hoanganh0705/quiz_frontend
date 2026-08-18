

import { describe, expect, it } from "vitest";

import { KNOWN_WS_ERROR_CODES } from "../ws-error";
import {
decodeWsError,
getWsUserCopy,
} from "../ws-error";

describe("decodeWsError", () => {
describe("valid frame", () => {
it("parses a well-formed error frame", () => {
const result = decodeWsError({ code: "INSTANCE_NOT_FOUND", message: "Instance not found" });
expect(result.code).toBe("INSTANCE_NOT_FOUND");
expect(result.message).toBe("Instance not found");
expect(result.retryable).toBe(false);
expect(result.authRequired).toBe(false);
    });

it("extracts requestId when present", () => {
const result = decodeWsError({
code: "SERVER_ERROR",
message: "Internal error",
requestId: "req-abc-123",
      });
expect(result.requestId).toBe("req-abc-123");
    });

it("omits requestId when missing", () => {
const result = decodeWsError({ code: "RATE_LIMITED", message: "Slow down" });
expect(result.requestId).toBeUndefined();
    });
  });

describe("retryable flag", () => {
it("RATE_LIMITED is retryable", () => {
const result = decodeWsError({ code: "RATE_LIMITED", message: "Rate limited" });
expect(result.retryable).toBe(true);
expect(result.authRequired).toBe(false);
    });

it("SERVER_ERROR is retryable", () => {
const result = decodeWsError({ code: "SERVER_ERROR", message: "Internal error" });
expect(result.retryable).toBe(true);
    });

it("TIMEOUT prefixed codes are retryable", () => {
const result = decodeWsError({ code: "TIMEOUT_EXCEEDED", message: "Timed out" });
expect(result.retryable).toBe(true);
    });

it("INSTANCE_NOT_FOUND is not retryable", () => {
const result = decodeWsError({ code: "INSTANCE_NOT_FOUND", message: "Not found" });
expect(result.retryable).toBe(false);
    });
  });

describe("authRequired flag", () => {
it("AUTH_TOKEN_EXPIRED requires auth", () => {
const result = decodeWsError({ code: "AUTH_TOKEN_EXPIRED", message: "Expired" });
expect(result.authRequired).toBe(true);
expect(result.retryable).toBe(false);
    });

it("AUTH_INVALID_TOKEN requires auth", () => {
const result = decodeWsError({ code: "AUTH_INVALID_TOKEN", message: "Bad token" });
expect(result.authRequired).toBe(true);
    });

it("AUTH_FORBIDDEN requires auth", () => {
const result = decodeWsError({ code: "AUTH_FORBIDDEN", message: "Forbidden" });
expect(result.authRequired).toBe(true);
    });

it("generic AUTH_ prefix requires auth", () => {
const result = decodeWsError({ code: "AUTH_SESSION_EXPIRED", message: "Session expired" });
expect(result.authRequired).toBe(true);
    });

it("RATE_LIMITED does not require auth", () => {
const result = decodeWsError({ code: "RATE_LIMITED", message: "Slow down" });
expect(result.authRequired).toBe(false);
    });

it("INSTANCE_NOT_FOUND does not require auth", () => {
const result = decodeWsError({ code: "INSTANCE_NOT_FOUND", message: "Not found" });
expect(result.authRequired).toBe(false);
    });
  });

describe("malformed input", () => {
it("returns UNKNOWN_ERROR for null", () => {
const result = decodeWsError(null);
expect(result.code).toBe("UNKNOWN_ERROR");
expect(result.message).toBe("null");
    });

it("returns UNKNOWN_ERROR for undefined", () => {
const result = decodeWsError(undefined);
expect(result.code).toBe("UNKNOWN_ERROR");
expect(result.message).toBe("undefined");
    });

it("returns UNKNOWN_ERROR for a primitive", () => {
const result = decodeWsError(42 as unknown);
expect(result.code).toBe("UNKNOWN_ERROR");
    });

it("falls back to UNKNOWN_ERROR when code is missing", () => {
const result = decodeWsError({ message: "Some error" } as never);
expect(result.code).toBe("UNKNOWN_ERROR");
    });

it("falls back to generic message when message is missing", () => {
const result = decodeWsError({ code: "ERR_CODE" } as never);
expect(result.message).toBe("An unknown error occurred.");
    });

it("trims whitespace from code", () => {
const result = decodeWsError({ code: "  RATE_LIMITED  ", message: "Rate limited" });
expect(result.code).toBe("RATE_LIMITED");
expect(result.retryable).toBe(true);
    });
  });
});

describe("getWsUserCopy", () => {
it("returns copy for a code present in USER_COPY", () => {

const copy = getWsUserCopy("AUTH_TOKEN_EXPIRED");
expect(copy.title.length).toBeGreaterThan(0);
expect(copy.body.length).toBeGreaterThan(0);
  });

it("returns a WS-specific fallback for a code not in USER_COPY", () => {

const copy = getWsUserCopy("UNKNOWN_ERROR");
expect(copy.title).toBe("Connection error");
expect(copy.body).toBe("An error occurred. Please try again.");
  });
});

describe("KNOWN_WS_ERROR_CODES", () => {
it("is a non-empty readonly array", () => {
expect(Array.isArray(KNOWN_WS_ERROR_CODES)).toBe(true);
expect(KNOWN_WS_ERROR_CODES.length).toBeGreaterThan(0);
  });

it("contains AUTH_TOKEN_EXPIRED and RATE_LIMITED", () => {
expect(KNOWN_WS_ERROR_CODES).toContain("AUTH_TOKEN_EXPIRED");
expect(KNOWN_WS_ERROR_CODES).toContain("RATE_LIMITED");
  });

it("does not contain duplicates", () => {
const unique = new Set(KNOWN_WS_ERROR_CODES);
expect(unique.size).toBe(KNOWN_WS_ERROR_CODES.length);
  });
});

