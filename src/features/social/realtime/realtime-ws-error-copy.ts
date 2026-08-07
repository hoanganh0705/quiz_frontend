/**
 * `realtime-ws-error-copy.ts` — user-facing copy registry for the
 * four Epic 6.10 WebSocket error codes.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.F1.
 *
 * ## Purpose
 *
 * Decouples transport-level WS error details (codes, raw messages)
 * from the user-facing copy that `RealtimeWsErrorToast` displays.
 *
 * The four codes captured here are the documented Epic 6.10 errors
 * (per the master plan Phase 6 Risks § "WS error decoupling"):
 *
 *   - `WS_RECONNECT_FAILED` — emit after the bounded backoff exhausts
 *                              the retry budget.
 *   - `WS_AUTH_EXPIRED`      — session expired; user must re-auth.
 *   - `WS_RATE_LIMITED`      — too many events; pause live updates.
 *   - `WS_INTERNAL`          — generic transport failure.
 *
 * The registry exposes:
 *
 *   - `REALTIME_WS_ERROR_COPY` — the literal `Record` keyed by code.
 *   - `getRealtimeWsErrorCopy(code)` — safe accessor; falls back to
 *     the `WS_INTERNAL` entry for unknown codes.
 *   - `RealtimeWsErrorCode` — the literal union of the four codes.
 *
 * ## Transport-decoupling guarantee
 *
 * None of the four entries mention `ws://`, `socket`, or `handshake`.
 * A regression test (`realtime-ws-error-copy.spec.ts`) asserts the
 * invariant so a future PR cannot leak transport vocabulary into
 * user copy.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The registry never references `friendshipId` or `followId`. The
 * copy is generic WS-error copy, not relationship-specific.
 */

import type { WsError } from "@/lib/realtime/ws-error";

// ─── Code union ──────────────────────────────────────────────────────────────

/**
 * The four documented Epic 6.10 WebSocket error codes.
 */
export const REALTIME_WS_ERROR_CODES = [
  "WS_RECONNECT_FAILED",
  "WS_AUTH_EXPIRED",
  "WS_RATE_LIMITED",
  "WS_INTERNAL",
] as const;

export type RealtimeWsErrorCode = (typeof REALTIME_WS_ERROR_CODES)[number];

// ─── Copy shape ──────────────────────────────────────────────────────────────

/**
 * User-facing copy for one WS error code.
 */
export interface RealtimeWsErrorCopy {
  /** Short, attention-grabbing title for the toast. */
  title: string;
  /** One-sentence body explaining the failure. */
  description: string;
  /**
   * Optional action-label text. The toast renders this as a button
   * when present (e.g. "Sign in" for `WS_AUTH_EXPIRED`).
   */
  actionLabel?: string;
  /**
   * Optional `data-testid` attribute value the toast renders so the
   * spec can locate the rendered element by role-agnostic id.
   */
  dataTestid: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

/**
 * The literal copy registry. The map is `Readonly` and `as const`-shaped
 * so consumers can rely on exhaustive key coverage.
 */
export const REALTIME_WS_ERROR_COPY: Readonly<
  Record<RealtimeWsErrorCode, RealtimeWsErrorCopy>
> = {
  WS_RECONNECT_FAILED: {
    title: "Live updates paused",
    description: "We'll keep trying in the background.",
    dataTestid: "realtime-ws-error-toast-reconnect-failed",
  },
  WS_AUTH_EXPIRED: {
    title: "Sign in again to see live updates",
    description: "Your session expired. Re-authenticate to resume notifications.",
    actionLabel: "Sign in",
    dataTestid: "realtime-ws-error-toast-auth-expired",
  },
  WS_RATE_LIMITED: {
    title: "Live updates paused",
    description: "Too many events. Updates will resume shortly.",
    dataTestid: "realtime-ws-error-toast-rate-limited",
  },
  WS_INTERNAL: {
    title: "Live updates unavailable",
    description: "Something went wrong on our end. Try refreshing the page.",
    dataTestid: "realtime-ws-error-toast-internal",
  },
};

/**
 * Safe accessor that always returns a `RealtimeWsErrorCopy`. Unknown
 * codes resolve to the `WS_INTERNAL` fallback entry (generic,
 * transport-agnostic).
 *
 * @param code - The WS error code. Strings outside the documented
 *               four-code union are accepted and return the generic
 *               fallback; this keeps the toast from ever rendering
 *               a `code: undefined` placeholder.
 */
export function getRealtimeWsErrorCopy(code: string | null | undefined): RealtimeWsErrorCopy {
  if (code !== null && code !== undefined && isRealtimeWsErrorCode(code)) {
    return REALTIME_WS_ERROR_COPY[code];
  }
  return REALTIME_WS_ERROR_COPY.WS_INTERNAL;
}

/**
 * Type guard for the four-code union.
 */
export function isRealtimeWsErrorCode(code: string): code is RealtimeWsErrorCode {
  return (REALTIME_WS_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * Coerce a `WsError` (Phase 5) to a `RealtimeWsErrorCode`. Maps the
 * known Phase 5 codes (`AUTH_TOKEN_EXPIRED`, `RATE_LIMITED`,
 * `SERVER_ERROR`) to their Epic 6.10 equivalents; everything else
 * falls back to `WS_INTERNAL`.
 */
export function mapWsErrorToRealtimeCode(error: WsError | null | undefined): RealtimeWsErrorCode {
  if (error === null || error === undefined) return "WS_INTERNAL";
  const code = error.code;
  if (code === "AUTH_TOKEN_EXPIRED" || code === "AUTH_INVALID_TOKEN" || code === "AUTH_FORBIDDEN") {
    return "WS_AUTH_EXPIRED";
  }
  if (code === "RATE_LIMITED") return "WS_RATE_LIMITED";
  return "WS_INTERNAL";
}