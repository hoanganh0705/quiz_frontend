

import { getUserCopy, UNKNOWN_USER_COPY } from "@/lib/api/error-codes";

import type { WsErrorPayload } from "./events";

export interface WsError {

code: string;

message: string;

requestId?: string;

retryable: boolean;

authRequired: boolean;
}

export const KNOWN_WS_ERROR_CODES = [

"AUTH_TOKEN_EXPIRED",
"AUTH_FORBIDDEN",
"AUTH_INVALID_TOKEN",

"INSTANCE_NOT_FOUND",
"INSTANCE_FULL",
"INSTANCE_ALREADY_STARTED",
"INSTANCE_ALREADY_CLOSED",
"HOST_REQUIRED",

"TOURNAMENT_NOT_FOUND",
"TOURNAMENT_FULL",
"TOURNAMENT_REGISTRATION_CLOSED",
"ALREADY_REGISTERED",
"NOT_REGISTERED",

"RATE_LIMITED",
"SERVER_ERROR",
"UNKNOWN_ERROR",
] as const;

export type KnownWsErrorCode = (typeof KNOWN_WS_ERROR_CODES)[number];

const AUTH_REQUIRED_PATTERNS: Array<{ prefix?: string; code: string }> = [
{ code: "AUTH_TOKEN_EXPIRED" },
{ code: "AUTH_INVALID_TOKEN" },
{ code: "AUTH_FORBIDDEN" },
{ code: "", prefix: "AUTH_" }, // catch-all for any future AUTH_* codes
];

const RETRYABLE_PATTERNS: Array<{ prefix?: string; code: string }> = [
{ code: "RATE_LIMITED" },
{ code: "", prefix: "TIMEOUT" },
{ code: "SERVER_ERROR" },
];

function matchesPattern(code: string, pattern: { prefix?: string; code: string }): boolean {
if (pattern.prefix) {
return code.startsWith(pattern.prefix);
  }
return code === pattern.code;
}

function isAuthRequired(code: string): boolean {
return AUTH_REQUIRED_PATTERNS.some((p) => matchesPattern(code, p));
}

function isRetryable(code: string): boolean {
return RETRYABLE_PATTERNS.some((p) => matchesPattern(code, p));
}

export function decodeWsError(raw: unknown): WsError {
if (!raw || typeof raw !== "object") {

return buildWsError({ code: "UNKNOWN_ERROR", message: String(raw) });
  }

const obj = raw as Record<string, unknown>;

const code = typeof obj.code === "string" ? obj.code.trim() : "UNKNOWN_ERROR";
const message =
typeof obj.message === "string" ? obj.message : "An unknown error occurred.";
const requestId =
typeof obj.requestId === "string" ? obj.requestId : undefined;

return buildWsError({ code, message, requestId });
}

function buildWsError(input: {
code: string;
message: string;
requestId?: string;
}): WsError {
return {
...input,
retryable: isRetryable(input.code),
authRequired: isAuthRequired(input.code),
  };
}

export function getWsUserCopy(code: string): {
title: string;
body: string;
} {
const copy = getUserCopy(code);

if (copy.title === UNKNOWN_USER_COPY.title) {

return {
title: "Connection error",
body: "An error occurred. Please try again.",
    };
  }

return copy;
}
