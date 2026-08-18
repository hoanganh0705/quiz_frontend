

import { describe, expect, it } from "vitest";

import {
ACTIVITY_DISCRIMINATOR_INVARIANTS,
ACTIVITY_ITEM_TYPES,
ACTIVITY_RATE_LIMIT_ERROR_CODES,
DEFENSIVE_FALLBACK_TESTID,
type ActivityItemType,
isActivityItemType,
isActivityRateLimitCode,
} from "@/features/social/activity-discriminator";

describe("ActivityItemType union members", () => {
it("is enumerable so a type-level regression is also a runtime regression", () => {
const expected: ActivityItemType[] = [
"badge_earned",
"badge_revoked",
"rank_milestone",
"peak_rank_achieved",
"tournament_joined",
"tournament_completed",
"tournament_won",
"comment_created",
"quiz_completed",
"quiz_milestone",
"instance_created",
"instance_joined",
"instance_completed",
    ];
for (const item of expected) {
expect(isActivityItemType(item)).toBe(true);
    }
  });
});

describe("ACTIVITY_ITEM_TYPES", () => {
it("is non-empty", () => {
expect(ACTIVITY_ITEM_TYPES.length).toBeGreaterThan(0);
  });

it("contains every documented ActivityItemType exactly once", () => {
const set = new Set(ACTIVITY_ITEM_TYPES);
expect(set.size).toBe(ACTIVITY_ITEM_TYPES.length);
  });
});

describe("isActivityItemType", () => {
it("returns true for every documented type", () => {
for (const item of ACTIVITY_ITEM_TYPES) {
expect(isActivityItemType(item)).toBe(true);
    }
  });

it("returns false for unknown strings", () => {
expect(isActivityItemType("garbage")).toBe(false);
expect(isActivityItemType("")).toBe(false);
expect(isActivityItemType("Badge_Earned")).toBe(false); // case-sensitive
  });

it("returns false for non-string inputs", () => {
expect(isActivityItemType(null)).toBe(false);
expect(isActivityItemType(undefined)).toBe(false);
expect(isActivityItemType(123)).toBe(false);
expect(isActivityItemType({})).toBe(false);
expect(isActivityItemType([])).toBe(false);
  });
});

describe("DEFENSIVE_FALLBACK_TESTID", () => {
it("is 'activity-item-unsupported'", () => {
expect(DEFENSIVE_FALLBACK_TESTID).toBe("activity-item-unsupported");
  });
});

describe("ACTIVITY_RATE_LIMIT_ERROR_CODES", () => {
it("is non-empty", () => {
expect(ACTIVITY_RATE_LIMIT_ERROR_CODES.length).toBeGreaterThan(0);
  });

it("contains GLOBAL_RATE_LIMITED", () => {
expect(
(ACTIVITY_RATE_LIMIT_ERROR_CODES as readonly string[]).includes(
"GLOBAL_RATE_LIMITED",
      ),
    ).toBe(true);
  });
});

describe("isActivityRateLimitCode", () => {
it("returns true for documented rate-limit codes", () => {
for (const code of ACTIVITY_RATE_LIMIT_ERROR_CODES) {
expect(isActivityRateLimitCode(code)).toBe(true);
    }
  });

it("returns false for non-rate-limit codes", () => {
expect(isActivityRateLimitCode("GLOBAL_INTERNAL_ERROR")).toBe(false);
expect(isActivityRateLimitCode("USER_NOT_FOUND")).toBe(false);
  });

it("returns false for undefined / non-string inputs", () => {
expect(isActivityRateLimitCode(undefined)).toBe(false);
  });
});

describe("ACTIVITY_DISCRIMINATOR_INVARIANTS", () => {
it("is frozen", () => {
expect(Object.isFrozen(ACTIVITY_DISCRIMINATOR_INVARIANTS)).toBe(true);
  });

it("mirrors the individual exports", () => {
expect(ACTIVITY_DISCRIMINATOR_INVARIANTS.itemTypes).toBe(
ACTIVITY_ITEM_TYPES,
    );
expect(ACTIVITY_DISCRIMINATOR_INVARIANTS.defensiveFallbackTestId).toBe(
DEFENSIVE_FALLBACK_TESTID,
    );
expect(ACTIVITY_DISCRIMINATOR_INVARIANTS.rateLimitErrorCodes).toBe(
ACTIVITY_RATE_LIMIT_ERROR_CODES,
    );
  });
});
