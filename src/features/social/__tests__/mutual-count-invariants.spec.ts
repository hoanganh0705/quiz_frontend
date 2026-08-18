

import { describe, expect, it } from "vitest";

import {
MUTUAL_COUNT_INVARIANTS,
MUTUAL_LIST_PAGE_SIZE,
MUTUAL_PREVIEW_CAP,
MUTUAL_TOTAL_HARD_CAP,
mutualCountOverflow,
} from "@/features/social/mutual-count-invariants";

describe("MUTUAL_PREVIEW_CAP", () => {
it("is 6", () => {
expect(MUTUAL_PREVIEW_CAP).toBe(6);
  });
});

describe("MUTUAL_LIST_PAGE_SIZE", () => {
it("is 20", () => {
expect(MUTUAL_LIST_PAGE_SIZE).toBe(20);
  });
});

describe("MUTUAL_TOTAL_HARD_CAP", () => {
it("is 500", () => {
expect(MUTUAL_TOTAL_HARD_CAP).toBe(500);
  });
});

describe("mutualCountOverflow", () => {
it("returns 0 when total <= visible", () => {
expect(mutualCountOverflow(6, 6)).toBe(0);
expect(mutualCountOverflow(6, 0)).toBe(0);
expect(mutualCountOverflow(6, 5)).toBe(0);
  });

it("returns total - visible when total is below the hard cap", () => {
expect(mutualCountOverflow(6, 18)).toBe(12);
expect(mutualCountOverflow(20, 45)).toBe(25);
  });

it("clamps to the hard cap when total exceeds MUTUAL_TOTAL_HARD_CAP", () => {

expect(mutualCountOverflow(6, 500)).toBe(494);

expect(mutualCountOverflow(6, 999)).toBe(494);
expect(mutualCountOverflow(20, 1000)).toBe(480);
  });

it("returns 0 when visible already meets the hard cap", () => {

expect(mutualCountOverflow(500, 500)).toBe(0);
expect(mutualCountOverflow(500, 999)).toBe(0);
  });

it("returns 0 for non-finite or negative inputs", () => {
expect(mutualCountOverflow(Number.NaN, 10)).toBe(0);
expect(mutualCountOverflow(6, Number.NaN)).toBe(0);
expect(mutualCountOverflow(-1, 10)).toBe(0);
expect(mutualCountOverflow(6, -1)).toBe(0);
  });
});

describe("MUTUAL_COUNT_INVARIANTS", () => {
it("is frozen", () => {
expect(Object.isFrozen(MUTUAL_COUNT_INVARIANTS)).toBe(true);
  });

it("exposes every documented constant", () => {
expect(MUTUAL_COUNT_INVARIANTS.previewCap).toBe(MUTUAL_PREVIEW_CAP);
expect(MUTUAL_COUNT_INVARIANTS.listPageSize).toBe(MUTUAL_LIST_PAGE_SIZE);
expect(MUTUAL_COUNT_INVARIANTS.totalHardCap).toBe(MUTUAL_TOTAL_HARD_CAP);
  });
});
