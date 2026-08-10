/**
 * `discovery-invariants.spec.ts` — Locks the discovery numeric
 * invariants contract (TKT-6.5.A3).
 *
 * Asserts:
 *
 *   - Every exported constant equals its documented value.
 *   - `clampDebounceWindow` returns the min for inputs below the
 *     min, the max for inputs above the max, and the input unchanged
 *     when in range.
 *   - `clampDebounceWindow` returns the default for non-finite inputs.
 *   - `isQueryLengthValid` returns `false` for empty / whitespace-only
 *     / below-min / above-max inputs and `true` for in-range inputs.
 *   - `DISCOVERY_INVARIANTS` exposes every constant.
 */

import { describe, expect, it } from "vitest";

import {
  clampDebounceWindow,
  DEBOUNCE_WINDOW_MS,
  DEBOUNCE_WINDOW_MAX_MS,
  DEBOUNCE_WINDOW_MIN_MS,
  DISCOVERY_INVARIANTS,
  isQueryLengthValid,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_PAGE_SIZE,
  SEARCH_VIRTUALIZATION_THRESHOLD,
  SUGGESTIONS_PAGE_SIZE,
  TRENDING_PAGE_SIZE,
} from "@/features/social/discovery-invariants";

describe("Discovery invariants constants", () => {
  it("DEBOUNCE_WINDOW_MS equals 300", () => {
    expect(DEBOUNCE_WINDOW_MS).toBe(300);
  });

  it("DEBOUNCE_WINDOW_MIN_MS equals 150", () => {
    expect(DEBOUNCE_WINDOW_MIN_MS).toBe(150);
  });

  it("DEBOUNCE_WINDOW_MAX_MS equals 600", () => {
    expect(DEBOUNCE_WINDOW_MAX_MS).toBe(600);
  });

  it("SEARCH_MIN_QUERY_LENGTH equals 2", () => {
    expect(SEARCH_MIN_QUERY_LENGTH).toBe(2);
  });

  it("SEARCH_MAX_QUERY_LENGTH equals 64", () => {
    expect(SEARCH_MAX_QUERY_LENGTH).toBe(64);
  });

  it("SEARCH_VIRTUALIZATION_THRESHOLD equals 40", () => {
    expect(SEARCH_VIRTUALIZATION_THRESHOLD).toBe(40);
  });

  it("SUGGESTIONS_PAGE_SIZE equals 10", () => {
    expect(SUGGESTIONS_PAGE_SIZE).toBe(10);
  });

  it("SEARCH_PAGE_SIZE equals 20", () => {
    expect(SEARCH_PAGE_SIZE).toBe(20);
  });

  it("TRENDING_PAGE_SIZE equals 25", () => {
    expect(TRENDING_PAGE_SIZE).toBe(25);
  });
});

describe("clampDebounceWindow", () => {
  it("returns the default for non-finite inputs", () => {
    expect(clampDebounceWindow(NaN)).toBe(DEBOUNCE_WINDOW_MS);
    expect(clampDebounceWindow(Infinity)).toBe(DEBOUNCE_WINDOW_MS);
    expect(clampDebounceWindow(-Infinity)).toBe(DEBOUNCE_WINDOW_MS);
  });

  it("returns DEBOUNCE_WINDOW_MIN_MS for inputs below the minimum", () => {
    expect(clampDebounceWindow(0)).toBe(DEBOUNCE_WINDOW_MIN_MS);
    expect(clampDebounceWindow(100)).toBe(DEBOUNCE_WINDOW_MIN_MS);
    expect(clampDebounceWindow(DEBOUNCE_WINDOW_MIN_MS - 1)).toBe(
      DEBOUNCE_WINDOW_MIN_MS,
    );
  });

  it("returns DEBOUNCE_WINDOW_MAX_MS for inputs above the maximum", () => {
    expect(clampDebounceWindow(DEBOUNCE_WINDOW_MAX_MS + 1)).toBe(
      DEBOUNCE_WINDOW_MAX_MS,
    );
    expect(clampDebounceWindow(1000)).toBe(DEBOUNCE_WINDOW_MAX_MS);
  });

  it("returns the input unchanged when in range", () => {
    expect(clampDebounceWindow(DEBOUNCE_WINDOW_MIN_MS)).toBe(
      DEBOUNCE_WINDOW_MIN_MS,
    );
    expect(clampDebounceWindow(DEBOUNCE_WINDOW_MS)).toBe(DEBOUNCE_WINDOW_MS);
    expect(clampDebounceWindow(DEBOUNCE_WINDOW_MAX_MS)).toBe(
      DEBOUNCE_WINDOW_MAX_MS,
    );
    expect(clampDebounceWindow(450)).toBe(450);
  });
});

describe("isQueryLengthValid", () => {
  it("returns false for empty string", () => {
    expect(isQueryLengthValid("")).toBe(false);
  });

  it("returns false for whitespace-only strings", () => {
    expect(isQueryLengthValid(" ")).toBe(false);
    expect(isQueryLengthValid("   ")).toBe(false);
    expect(isQueryLengthValid("\t")).toBe(false);
    expect(isQueryLengthValid("\n")).toBe(false);
  });

  it("returns false for strings below the minimum length", () => {
    expect(isQueryLengthValid("a")).toBe(false); // 1 char
  });

  it("returns true for strings at the minimum length", () => {
    expect(isQueryLengthValid("ab")).toBe(true); // 2 chars
    expect(isQueryLengthValid("ab ")).toBe(true); // 2 chars after trim
    expect(isQueryLengthValid(" ab")).toBe(true); // 2 chars after trim
  });

  it("returns true for strings within the range", () => {
    expect(isQueryLengthValid("abc")).toBe(true);
    expect(isQueryLengthValid("hello world")).toBe(true);
    expect(isQueryLengthValid("search query")).toBe(true);
  });

  it("returns true for strings at the maximum length", () => {
    const max = "a".repeat(SEARCH_MAX_QUERY_LENGTH);
    expect(isQueryLengthValid(max)).toBe(true);
  });

  it("returns false for strings above the maximum length", () => {
    const above = "a".repeat(SEARCH_MAX_QUERY_LENGTH + 1);
    expect(isQueryLengthValid(above)).toBe(false);
  });

  it("ignores leading and trailing whitespace", () => {
    expect(isQueryLengthValid("  ab")).toBe(true); // trim → 2 chars
    expect(isQueryLengthValid("ab  ")).toBe(true); // trim → 2 chars
    expect(isQueryLengthValid("   a")).toBe(false); // trim → 1 char
  });
});

describe("DISCOVERY_INVARIANTS frozen catalogue", () => {
  it("exposes every constant", () => {
    expect(DISCOVERY_INVARIANTS.debounceWindowMs).toBe(DEBOUNCE_WINDOW_MS);
    expect(DISCOVERY_INVARIANTS.debounceWindowMinMs).toBe(
      DEBOUNCE_WINDOW_MIN_MS,
    );
    expect(DISCOVERY_INVARIANTS.debounceWindowMaxMs).toBe(
      DEBOUNCE_WINDOW_MAX_MS,
    );
    expect(DISCOVERY_INVARIANTS.searchMinQueryLength).toBe(
      SEARCH_MIN_QUERY_LENGTH,
    );
    expect(DISCOVERY_INVARIANTS.searchMaxQueryLength).toBe(
      SEARCH_MAX_QUERY_LENGTH,
    );
    expect(DISCOVERY_INVARIANTS.virtualizationThreshold).toBe(
      SEARCH_VIRTUALIZATION_THRESHOLD,
    );
    expect(DISCOVERY_INVARIANTS.suggestionsPageSize).toBe(
      SUGGESTIONS_PAGE_SIZE,
    );
    expect(DISCOVERY_INVARIANTS.searchPageSize).toBe(SEARCH_PAGE_SIZE);
    expect(DISCOVERY_INVARIANTS.trendingPageSize).toBe(TRENDING_PAGE_SIZE);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(DISCOVERY_INVARIANTS)).toBe(true);
  });
});
