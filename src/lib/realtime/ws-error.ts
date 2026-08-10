/**
 * Typed WebSocket (Socket.IO) error decoder for Phase 5 namespaces.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.D1.
 *
 * ## Purpose
 *
 * Socket.IO emits errors as structured frames:
 *
 *   { event: 'error', data: { code: string; message: string } }
 *
 * `decodeWsError` parses this envelope and returns a typed `WsError` with
 * three additional fields TypeScript cannot infer from the raw payload:
 *
 *   - `retryable` — whether the client should automatically retry
 *   - `authRequired` — whether the error means the user must re-authenticate
 *
 * These flags are derived from the `code` field using the pattern tables
 * below. Unknown codes default to non-retryable, auth-not-required.
 *
 * ## Relationship to USER_COPY
 *
 * `getWsUserCopy` bridges `WsError.code` to the shared `USER_COPY` table
 * (`src/lib/api/error-codes.ts`). Codes that appear in both the REST and
 * WS error domain share the same user-facing copy. Codes unique to WS
 * use `UNKNOWN_USER_COPY` as a fallback.
 *
 * ## No circular dependency
 *
 * `error-codes.ts` does NOT import from this file. This module imports
 * from `error-codes.ts` to read `UNKNOWN_USER_COPY` and to call
 * `getUserCopy`. No circular dependency exists.
 */

import { getUserCopy, UNKNOWN_USER_COPY } from "@/lib/api/error-codes";

import type { WsErrorPayload } from "./events";

// ─── WsError ───────────────────────────────────────────────────────────────────

/**
 * Decoded Socket.IO error frame.
 *
 * Produced by `decodeWsError`. Used in the Phase 5 connection state machine
 * (`connection-state.ts`) and in all realtime hooks that surface errors to
 * the UI.
 */
export interface WsError {
  /** The machine-readable error code string. */
  code: string;
  /** Human-readable description from the backend. */
  message: string;
  /**
   * Optional request-trace ID for correlating with backend logs.
   * Present when the backend includes `requestId` in the error payload.
   */
  requestId?: string;
  /**
   * Whether the client should automatically retry this operation.
   * `true` for rate-limit and transient errors; `false` for auth failures
   * and permanent errors.
   */
  retryable: boolean;
  /**
   * Whether this error means the user's session is invalid and they must
   * re-authenticate. Triggers the `auth_required` state in the connection
   * state machine.
   */
  authRequired: boolean;
}

// ─── Known error code patterns ─────────────────────────────────────────────────

/**
 * Phase 5 WS error codes confirmed by the backend (TKT-5.1.A1 action item).
 * This set should be kept in sync with the backend's `ws-error-codes.ts`
 * as new codes are added.
 *
 * BACKEND_CONFIRM: this list requires sign-off from the backend team.
 */
export const KNOWN_WS_ERROR_CODES = [
  // Auth
  "AUTH_TOKEN_EXPIRED",
  "AUTH_FORBIDDEN",
  "AUTH_INVALID_TOKEN",
  // Instance
  "INSTANCE_NOT_FOUND",
  "INSTANCE_FULL",
  "INSTANCE_ALREADY_STARTED",
  "INSTANCE_ALREADY_CLOSED",
  "HOST_REQUIRED",
  // Tournament
  "TOURNAMENT_NOT_FOUND",
  "TOURNAMENT_FULL",
  "TOURNAMENT_REGISTRATION_CLOSED",
  "ALREADY_REGISTERED",
  "NOT_REGISTERED",
  // Generic
  "RATE_LIMITED",
  "SERVER_ERROR",
  "UNKNOWN_ERROR",
] as const;

export type KnownWsErrorCode = (typeof KNOWN_WS_ERROR_CODES)[number];

// ─── Pattern tables ────────────────────────────────────────────────────────────

/**
 * Codes that indicate the user must re-authenticate.
 * Matched by exact string or by prefix.
 */
const AUTH_REQUIRED_PATTERNS: Array<{ prefix?: string; code: string }> = [
  { code: "AUTH_TOKEN_EXPIRED" },
  { code: "AUTH_INVALID_TOKEN" },
  { code: "AUTH_FORBIDDEN" },
  { code: "", prefix: "AUTH_" }, // catch-all for any future AUTH_* codes
];

/**
 * Codes that are safe to automatically retry with back-off.
 */
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

// ─── decodeWsError ─────────────────────────────────────────────────────────────

/**
 * Parses a raw Socket.IO `error` frame into a typed `WsError`.
 *
 * @param raw - The `data` field of `{ event: 'error', data: ... }`.
 *   Expected shape: `{ code: string; message: string; requestId?: string }`.
 *   Extra fields are ignored.
 * @returns A `WsError` with `retryable` and `authRequired` derived from the
 *   code pattern. Unknown codes default to `{ retryable: false, authRequired: false }`.
 *
 * @example
 * ```ts
 * socket.on('error', (raw: unknown) => {
 *   const error = decodeWsError(raw);
 *   if (error.authRequired) {
 *     redirectToLogin();
 *   }
 * });
 * ```
 */
export function decodeWsError(raw: unknown): WsError {
  if (!raw || typeof raw !== "object") {
    // `typeof null === "object"` in JS, so this branch fires for both null and
    // undefined. `String(null)` → "null", `String(undefined)` → "undefined".
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

// ─── getWsUserCopy ─────────────────────────────────────────────────────────────

/**
 * User-facing copy for a decoded WS error.
 *
 * Delegates to `USER_COPY` (`src/lib/api/error-codes.ts`) for codes that
 * overlap with the REST error domain. Returns `UNKNOWN_USER_COPY` for
 * WS-only codes that have no entry in the table.
 *
 * @param code - A WS error code (e.g. `AUTH_TOKEN_EXPIRED`).
 * @returns `{ title, body }` suitable for rendering in a toast or error page.
 *
 * @example
 * ```ts
 * const { title, body } = getWsUserCopy(error.code);
 * toast.error(title, { description: body });
 * ```
 */
export function getWsUserCopy(code: string): {
  title: string;
  body: string;
} {
  const copy = getUserCopy(code);

  if (copy.title === UNKNOWN_USER_COPY.title) {
    // Code not in USER_COPY — use a generic fallback specific to WS context
    return {
      title: "Connection error",
      body: "An error occurred. Please try again.",
    };
  }

  return copy;
}
