/**
 * `discovery-rate-limit.ts` — Decode the per-IP rate-limit signal from
 * HTTP response headers for the social user-search endpoint.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.A4.
 *
 * ## Purpose
 *
 * Single source of truth for decoding the per-IP rate-limit cooldown
 * from the backend's HTTP response headers for the N+1 `/social/users/search`
 * endpoint. The decoder:
 *
 *   - Reads the `X-RateLimit-Reset-Search` header first (epoch ms).
 *   - Falls back to `X-RateLimit-Reset-Search-Seconds` (cooldown in
 *     seconds) for simplicity.
 *   - Clamps negative or non-integer values to `null` so the consumer
 *     never receives an invalid cooldown.
 *   - Is a pure function — no clock, no random, safe to call inside
 *     `useMemo` and `useEffect` dependency arrays.
 *
 * ## Why a separate module from `rate-limit-decoder.ts`
 *
 * The existing `rate-limit-decoder.ts` (Epic 6.4 / TKT-6.4.D1) reads
 * the rate-limit signal from the `ApiError`'s RFC 7807 `extensions`
 * payload. The search endpoint surfaces its rate-limit signal via HTTP
 * response headers (a different channel). The `discovery-rate-limit.ts`
 * module is a separate module so the two channels are never conflated.
 *
 * ## SSR-safety
 *
 * The function reads no `window`, `localStorage`, or other browser-only
 * API. It is safe to import from Server Components and from the App
 * Router's route modules.
 */

// ─── Header names ───────────────────────────────────────────────────────────

/**
 * The primary per-IP rate-limit reset header name.
 *
 * The header carries the cooldown as an epoch timestamp (milliseconds
 * since Unix epoch). The frontend computes the remaining cooldown by
 * subtracting `Date.now()` from this value.
 *
 * Subject to the backend's actual header name — the frontend treats
 * this documented value as the canonical reference.
 */
export const SEARCH_RATE_LIMIT_HEADER =
  "X-RateLimit-Reset-Search" as const;

/**
 * The fallback per-IP rate-limit reset header name.
 *
 * The header carries the cooldown directly in seconds. This is a
 * simpler alternative to the epoch-ms header and is used when the
 * backend does not set the primary header.
 */
export const SEARCH_RATE_LIMIT_HEADER_SECONDS =
  "X-RateLimit-Reset-Search-Seconds" as const;

// ─── Decoded result ─────────────────────────────────────────────────────────

/**
 * The decoded search rate-limit result.
 *
 * `cooldownSeconds === null` means no rate-limit signal was present
 * in the response headers; `cooldownSeconds > 0` means the consumer
 * should surface the cooldown to the user.
 */
export interface DecodedSearchRateLimit {
  /**
   * The cooldown in seconds. Positive integer when a rate-limit header
   * was present and parseable; `null` when no signal was present or
   * the signal was unparseable.
   */
  readonly cooldownSeconds: number | null;
}

// ─── Decoder ───────────────────────────────────────────────────────────────

/**
 * Decode the per-IP rate-limit cooldown from HTTP response headers
 * for the social user-search endpoint.
 *
 * Reads the `X-RateLimit-Reset-Search` header (epoch ms) first.
 * Falls back to `X-RateLimit-Reset-Search-Seconds` (seconds) when
 * the primary header is absent. Returns `null` when no header is
 * present or the values are unparseable.
 *
 * The function is pure so it is safe to call inside `useMemo` and
 * in specs without flake.
 *
 * @param headers — The raw headers object from the SDK response.
 *                  The shape matches the `orvalCustomInstance` response
 *                  headers object.
 * @returns A `DecodedSearchRateLimit` result.
 *
 * @example
 *   // No header present
 *   decodeSearchRateLimit({})  // { cooldownSeconds: null }
 *
 *   // Seconds header present (preferred when epoch-ms is absent)
 *   decodeSearchRateLimit({ "x-ratelimit-reset-search-seconds": "30" })
 *   // { cooldownSeconds: 30 }
 *
 *   // Epoch-ms header present
 *   decodeSearchRateLimit({ "x-ratelimit-reset-search": String(Date.now() + 30_000) })
 *   // { cooldownSeconds: 30 }
 *
 *   // Header present but unparseable
 *   decodeSearchRateLimit({ "x-ratelimit-reset-search-seconds": "garbage" })
 *   // { cooldownSeconds: null }
 */
export function decodeSearchRateLimit(
  headers: Record<string, string | string[] | undefined>,
): DecodedSearchRateLimit {
  // Helper: normalise a header value to a string or null.
  const toString = (
    value: string | string[] | undefined,
  ): string | null => {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return value;
  };

  // Helper: parse a non-negative integer from a string.
  const parseNonNegativeInt = (s: string | null): number | null => {
    if (s === null) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return null;
    // Round to nearest integer and clamp to a safe upper bound (1 hour).
    const rounded = Math.round(n);
    if (rounded > 3600) return 3600;
    return rounded;
  };

  // Helper: case-insensitive header lookup.
  const getHeader = (
    h: Record<string, string | string[] | undefined>,
    name: string,
  ): string | null => {
    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(h)) {
      if (key.toLowerCase() === lower) {
        return toString(value);
      }
    }
    return null;
  };

  // Path 1: epoch-ms header (preferred).
  //
  // The header value is an absolute epoch in milliseconds (the time
  // at which the rate-limit window expires). We convert it to a
  // "cooldown in seconds" by subtracting the current clock.
  // Negative deltas (epoch already in the past) are surfaced as
  // `null` so the caller can fall back to the seconds header (or
  // to "no signal").
  //
  // We deliberately do NOT clamp the epoch value here — the header
  // is an absolute timestamp in the far future, not a small
  // duration. The clamp at the `Math.min(seconds, 3600)` line below
  // bounds the OUTPUT seconds, not the INPUT epoch.
  const epochStr = getHeader(headers, SEARCH_RATE_LIMIT_HEADER);
  if (epochStr !== null) {
    const epochNum = Number(epochStr);
    if (Number.isFinite(epochNum) && epochNum >= 0) {
      const deltaMs = epochNum - Date.now();
      if (deltaMs > 0) {
        const seconds = Math.ceil(deltaMs / 1000);
        return { cooldownSeconds: Math.min(seconds, 3600) };
      }
    }
  }

  // Path 2: seconds header (fallback).
  const secondsStr = getHeader(headers, SEARCH_RATE_LIMIT_HEADER_SECONDS);
  if (secondsStr !== null) {
    const seconds = parseNonNegativeInt(secondsStr);
    if (seconds !== null && seconds > 0) {
      return { cooldownSeconds: Math.min(seconds, 3600) };
    }
  }

  // Path 3: no signal present.
  return { cooldownSeconds: null };
}
