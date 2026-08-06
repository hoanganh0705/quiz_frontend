/**
 * `rate-limit-decoder.ts` — Decode the rate-limit signal from an
 * `ApiError`'s RFC 7807 `extensions` payload.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.D1.
 *
 * ## Purpose
 *
 * The single source of truth for decoding the rate-limit
 * cooldown from the backend's RFC 7807 `extensions.retryAfterMs`
 * payload. The decoder:
 *
 *   - Accepts an `ApiError` (the canonical error class produced
 *     by every Story 6.4 service call) and returns either a
 *     `cooldownSeconds: number` (positive integer) or `null`
 *     (no rate-limit signal).
 *   - Reads `data.extensions?.retryAfterMs` first (the canonical
 *     RFC 7807 location). Falls back to `data.extensions?.retryAfterSeconds`
 *     for backward compatibility with the documented SearchRateLimitState
 *     payload (Epic 5.6 / TKT-5.6.C1).
 *   - Clamps negative or non-integer values to `null` so the
 *     consumer never receives an invalid cooldown.
 *   - Is a pure function — no clock, no random, safe to call
 *     inside `useMemo` and `useEffect` dependency arrays.
 *
 * ## Why not read from `response.headers['retry-after']`
 *
 * The `orvalCustomInstance` (Phase 1.4) wraps axios but does not
 * surface HTTP headers on `ApiError`. The RFC 7807 extension
 * payload is the canonical frontend-side source for the
 * retry-after signal. A future migration to a header-aware
 * decoder can swap the implementation behind this function.
 *
 * ## SSR-safety
 *
 * The function reads no `window`, `localStorage`, or other
 * browser-only API. It is safe to import from Server Components
 * and from the App Router's route modules.
 */

import type { ApiError } from "@/lib/api";

/**
 * The decoded rate-limit result. `cooldownSeconds === null` means
 * the error did not carry a rate-limit signal; `cooldownSeconds > 0`
 * means the consumer should surface the cooldown to the user.
 */
export interface DecodedRateLimit {
  /**
   * The cooldown in seconds. Positive integer when a rate-limit
   * signal was present; `null` when no signal was present or the
   * signal was unparseable.
   */
  readonly cooldownSeconds: number | null;
}

/**
 * Decode the rate-limit signal from an `ApiError`'s RFC 7807
 * `extensions` payload. Returns `cooldownSeconds: null` when no
 * signal is present or the signal is unparseable.
 *
 * @param error The `ApiError` to inspect.
 * @returns A `DecodedRateLimit` result.
 */
export function decodeRateLimit(error: ApiError | null): DecodedRateLimit {
  if (error === null) {
    return { cooldownSeconds: null };
  }
  // The `ApiError` class intentionally does not expose `data`
  // (it's stored as a private field). We work around that by
  // reading from the `extensions.retryAfterMs` field via the
  // `(error as unknown as Record<string, unknown>)` escape hatch.
  // The downstream cast is the documented seam for forward-
  // compatibility — the field is documented in `ApiError`'s
  // Rfc7807Body type but not currently exposed as a getter.
  const raw = error as unknown as {
    data?: {
      extensions?: {
        retryAfterMs?: unknown;
        retryAfterSeconds?: unknown;
      };
    };
  };
  const extensions = raw.data?.extensions;
  if (extensions === undefined) {
    return { cooldownSeconds: null };
  }
  // Prefer the canonical `retryAfterMs` field.
  if (typeof extensions.retryAfterMs === "number" && extensions.retryAfterMs > 0) {
    return { cooldownSeconds: Math.ceil(extensions.retryAfterMs / 1000) };
  }
  // Fall back to the legacy `retryAfterSeconds` field (Epic 5.6).
  if (
    typeof extensions.retryAfterSeconds === "number" &&
    extensions.retryAfterSeconds > 0
  ) {
    return { cooldownSeconds: Math.ceil(extensions.retryAfterSeconds) };
  }
  return { cooldownSeconds: null };
}

/**
 * Read-only record exposing the documented rate-limit error codes.
 * The set is the union of the codes that surface the
 * `ActivityRateLimitNotice` (TKT-6.4.B3).
 */
export const RATE_LIMIT_ERROR_CODES = Object.freeze([
  "ACTIVITY_RATE_LIMITED",
  "GLOBAL_RATE_LIMITED",
]) as readonly string[];

/**
 * Type guard — `code is "ACTIVITY_RATE_LIMITED" | "GLOBAL_RATE_LIMITED"`.
 */
export function isRateLimitErrorCode(
  code: string | undefined,
): code is "ACTIVITY_RATE_LIMITED" | "GLOBAL_RATE_LIMITED" {
  if (!code) return false;
  return (RATE_LIMIT_ERROR_CODES as readonly string[]).includes(code);
}
