

import { describe, expect, it } from "vitest";

import {
REALTIME_WS_ERROR_CODES,
REALTIME_WS_ERROR_COPY,
getRealtimeWsErrorCopy,
isRealtimeWsErrorCode,
mapWsErrorToRealtimeCode,
} from "@/features/social/realtime/realtime-ws-error-copy";
import type { WsError } from "@/lib/realtime/ws-error";

const FORBIDDEN_TERMS = ["ws://", "wss://", "socket", "handshake"] as const;

describe("realtime-ws-error-copy (TKT-6.10.F1)", () => {
it("covers all four documented WS error codes", () => {
expect(REALTIME_WS_ERROR_CODES).toEqual([
"WS_RECONNECT_FAILED",
"WS_AUTH_EXPIRED",
"WS_RATE_LIMITED",
"WS_INTERNAL",
    ]);
for (const code of REALTIME_WS_ERROR_CODES) {
expect(REALTIME_WS_ERROR_COPY[code]).toBeDefined();
    }
  });

it("each entry has a `title`, `description`, and `dataTestid`", () => {
for (const code of REALTIME_WS_ERROR_CODES) {
const entry = REALTIME_WS_ERROR_COPY[code];
expect(typeof entry.title).toBe("string");
expect(entry.title.length).toBeGreaterThan(0);
expect(typeof entry.description).toBe("string");
expect(entry.description.length).toBeGreaterThan(0);
expect(typeof entry.dataTestid).toBe("string");
expect(entry.dataTestid.length).toBeGreaterThan(0);
    }
  });

it("the auth-expired entry exposes an `actionLabel`", () => {
expect(REALTIME_WS_ERROR_COPY.WS_AUTH_EXPIRED.actionLabel).toBe("Sign in");
  });

it("none of the copy mentions transport-specific terms", () => {
for (const code of REALTIME_WS_ERROR_CODES) {
const entry = REALTIME_WS_ERROR_COPY[code];
const serialised = `${entry.title} ${entry.description} ${entry.actionLabel ?? ""}`;
for (const term of FORBIDDEN_TERMS) {
expect(serialised).not.toMatch(new RegExp(term, "i"));
      }
    }
  });

it("none of the copy mentions `friendshipId` or `followId`", () => {
for (const code of REALTIME_WS_ERROR_CODES) {
const serialised = JSON.stringify(REALTIME_WS_ERROR_COPY[code]);
expect(serialised).not.toMatch(/friendshipId/);
expect(serialised).not.toMatch(/followId/);
    }
  });

it("getRealtimeWsErrorCopy returns the entry for known codes", () => {
for (const code of REALTIME_WS_ERROR_CODES) {
const entry = getRealtimeWsErrorCopy(code);
expect(entry).toEqual(REALTIME_WS_ERROR_COPY[code]);
    }
  });

it("getRealtimeWsErrorCopy falls back to WS_INTERNAL for unknown codes", () => {
const entry = getRealtimeWsErrorCopy("SOMETHING_NEW");
expect(entry).toEqual(REALTIME_WS_ERROR_COPY.WS_INTERNAL);
  });

it("getRealtimeWsErrorCopy handles null and undefined inputs", () => {
expect(getRealtimeWsErrorCopy(null)).toEqual(REALTIME_WS_ERROR_COPY.WS_INTERNAL);
expect(getRealtimeWsErrorCopy(undefined)).toEqual(REALTIME_WS_ERROR_COPY.WS_INTERNAL);
expect(getRealtimeWsErrorCopy("")).toEqual(REALTIME_WS_ERROR_COPY.WS_INTERNAL);
  });

it("isRealtimeWsErrorCode type guard narrows correctly", () => {
for (const code of REALTIME_WS_ERROR_CODES) {
expect(isRealtimeWsErrorCode(code)).toBe(true);
    }
expect(isRealtimeWsErrorCode("OTHER")).toBe(false);
expect(isRealtimeWsErrorCode("")).toBe(false);
  });

it("mapWsErrorToRealtimeCode maps Phase 5 auth codes to WS_AUTH_EXPIRED", () => {
const codes = ["AUTH_TOKEN_EXPIRED", "AUTH_INVALID_TOKEN", "AUTH_FORBIDDEN"] as const;
for (const code of codes) {
const error: WsError = {
code,
message: "stub",
retryable: false,
authRequired: true,
      };
expect(mapWsErrorToRealtimeCode(error)).toBe("WS_AUTH_EXPIRED");
    }
  });

it("mapWsErrorToRealtimeCode maps RATE_LIMITED to WS_RATE_LIMITED", () => {
const error: WsError = {
code: "RATE_LIMITED",
message: "stub",
retryable: true,
authRequired: false,
    };
expect(mapWsErrorToRealtimeCode(error)).toBe("WS_RATE_LIMITED");
  });

it("mapWsErrorToRealtimeCode falls back to WS_INTERNAL for unknown codes", () => {
const error: WsError = {
code: "SOMETHING_NEW",
message: "stub",
retryable: false,
authRequired: false,
    };
expect(mapWsErrorToRealtimeCode(error)).toBe("WS_INTERNAL");
  });

it("mapWsErrorToRealtimeCode returns WS_INTERNAL for null / undefined", () => {
expect(mapWsErrorToRealtimeCode(null)).toBe("WS_INTERNAL");
expect(mapWsErrorToRealtimeCode(undefined)).toBe("WS_INTERNAL");
  });
});