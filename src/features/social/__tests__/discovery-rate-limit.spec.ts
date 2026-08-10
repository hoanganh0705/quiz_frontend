/**
 * `discovery-rate-limit.spec.ts` — Locks the search rate-limit header
 * decoding contract (TKT-6.5.A4).
 *
 * Asserts:
 *
 *   - `decodeSearchRateLimit` returns `{ cooldownSeconds: null }` when
 *     no relevant header is present.
 *   - `decodeSearchRateLimit` returns `{ cooldownSeconds: positive }` when
 *     the seconds header is present and parseable.
 *   - `decodeSearchRateLimit` prefers the epoch-ms header over the seconds
 *     header.
 *   - `decodeSearchRateLimit` returns `{ cooldownSeconds: null }` when
 *     a header is present but unparseable.
 *   - `decodeSearchRateLimit` handles multi-value headers.
 *   - Header name lookup is case-insensitive.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  decodeSearchRateLimit,
  SEARCH_RATE_LIMIT_HEADER,
  SEARCH_RATE_LIMIT_HEADER_SECONDS,
} from "@/features/social/discovery-rate-limit";

describe("decodeSearchRateLimit — no-header path", () => {
  it("returns null for an empty headers object", () => {
    expect(decodeSearchRateLimit({})).toEqual({ cooldownSeconds: null });
  });

  it("returns null when no relevant header is present", () => {
    expect(
      decodeSearchRateLimit({ "content-type": "application/json" }),
    ).toEqual({ cooldownSeconds: null });
    expect(
      decodeSearchRateLimit({ "x-other": "value" }),
    ).toEqual({ cooldownSeconds: null });
  });
});

describe("decodeSearchRateLimit — seconds header (X-RateLimit-Reset-Search-Seconds)", () => {
  it("returns the parsed seconds when the header is present and valid", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "30",
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: 30 });
  });

  it("handles fractional seconds by rounding", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "30.7",
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: 31 });
  });

  it("returns null for zero", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "0",
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: null });
  });

  it("returns null for negative values", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "-5",
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: null });
  });

  it("returns null for unparseable strings", () => {
    expect(
      decodeSearchRateLimit({ [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "garbage" }),
    ).toEqual({ cooldownSeconds: null });
    expect(
      decodeSearchRateLimit({ [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "" }),
    ).toEqual({ cooldownSeconds: null });
    expect(
      decodeSearchRateLimit({ [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "NaN" }),
    ).toEqual({ cooldownSeconds: null });
  });

  it("clamps large values to 3600 seconds", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: String(3600 * 2),
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: 3600 });
  });
});

describe("decodeSearchRateLimit — epoch-ms header (X-RateLimit-Reset-Search) takes priority", () => {
  beforeEach(() => {
    // Pin `Date.now()` via fake timers so the epoch-delta calculation
    // is deterministic. Set the system time to a known fixed value.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prefers the epoch-ms header over the seconds header when both are present", () => {
    // The seconds header is 60s from "now", but the epoch header is 30s from "now".
    const FIXED_NOW = 1_700_000_000_000; // 2023-11-13T12:26:40Z
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER]: String(FIXED_NOW + 30_000), // 30s from fixed "now"
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "60",
    };
    // If the epoch header is used, the result should be ~30s.
    // If the seconds header is used, the result would be 60s.
    // We check the epoch path by verifying it returns a value near 30s.
    const result = decodeSearchRateLimit(headers);
    expect(result.cooldownSeconds).toBeGreaterThanOrEqual(29);
    expect(result.cooldownSeconds).toBeLessThanOrEqual(31);
  });

  it("falls back to seconds header when epoch header is absent", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: "45",
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: 45 });
  });

  it("returns null when epoch header is present but epoch value is in the past", () => {
    // Epoch value is far in the past, so the cooldown is 0 or negative.
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER]: "1000", // 1 second since 1970 — far in the past
    };
    // The epoch is in the past so no valid cooldown.
    const result = decodeSearchRateLimit(headers);
    // The result should be null since the epoch is in the past
    // (our decoder returns null for values <= 0 after ceiling).
    expect(result.cooldownSeconds).toBeNull();
  });
});

describe("decodeSearchRateLimit — case-insensitive header lookup", () => {
  it("handles lowercase header names", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS.toLowerCase()]: "20",
    };
    // The decoder does a case-insensitive lookup over all headers.
    // Since we're passing a lowercase key, it should find it.
    // The header name "x-ratelimit-reset-search-seconds" will be matched
    // against "X-RateLimit-Reset-Search-Seconds" (case-insensitive).
    const result = decodeSearchRateLimit(headers);
    // The decoder normalises header values from arrays if needed.
    expect(result.cooldownSeconds).toBe(20);
  });
});

describe("decodeSearchRateLimit — multi-value headers", () => {
  it("uses the first value in a multi-value array", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: ["30", "60"],
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: 30 });
  });

  it("returns null when the first value in an array is empty", () => {
    const headers = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: ["", "30"],
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: null });
  });
});

describe("decodeSearchRateLimit — defensive", () => {
  it("ignores null values in the headers object", () => {
    const headers: Record<string, string | string[] | undefined> = {
      [SEARCH_RATE_LIMIT_HEADER_SECONDS]: undefined,
    };
    expect(decodeSearchRateLimit(headers)).toEqual({ cooldownSeconds: null });
  });
});
