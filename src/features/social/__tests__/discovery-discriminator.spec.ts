/**
 * `discovery-discriminator.spec.ts` — Locks the search-suggestion type
 * discriminator contract (TKT-6.5.A4).
 *
 * Asserts:
 *
 *   - `SocialSearchSuggestionKind` is a closed union whose members are
 *     exactly the documented discriminator values.
 *   - `isSocialSearchSuggestionKind` returns `true` for every documented
 *     kind and `false` for `null`, `undefined`, non-strings, and arbitrary
 *     strings.
 *   - `DEFENSIVE_FALLBACK_TESTID` is `social-search-unsupported-kind`.
 *   - `DISCOVERY_DISCRIMINATOR_INVARIANTS` exposes every constant.
 */

import { describe, expect, it } from "vitest";

import {
  type SocialSearchSuggestionKind,
  isSocialSearchSuggestionKind,
  DEFENSIVE_FALLBACK_TESTID,
  DISCOVERY_DISCRIMINATOR_INVARIANTS,
} from "@/features/social/discovery-discriminator";

describe("SocialSearchSuggestionKind union members", () => {
  it("is enumerable so a type-level regression is also a runtime regression", () => {
    const expected: SocialSearchSuggestionKind[] = [
      "user",
      "quiz",
      "tag",
      "group",
      "unsupported",
    ];
    for (const kind of expected) {
      expect(isSocialSearchSuggestionKind(kind)).toBe(true);
    }
  });
});

describe("isSocialSearchSuggestionKind", () => {
  it("returns true for every documented kind", () => {
    expect(isSocialSearchSuggestionKind("user")).toBe(true);
    expect(isSocialSearchSuggestionKind("quiz")).toBe(true);
    expect(isSocialSearchSuggestionKind("tag")).toBe(true);
    expect(isSocialSearchSuggestionKind("group")).toBe(true);
    expect(isSocialSearchSuggestionKind("unsupported")).toBe(true);
  });

  it("returns false for unknown strings", () => {
    expect(isSocialSearchSuggestionKind("garbage")).toBe(false);
    expect(isSocialSearchSuggestionKind("")).toBe(false);
    expect(isSocialSearchSuggestionKind("User")).toBe(false); // case-sensitive
    expect(isSocialSearchSuggestionKind("USER")).toBe(false);
    expect(isSocialSearchSuggestionKind("quizzz")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSocialSearchSuggestionKind(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSocialSearchSuggestionKind(undefined)).toBe(false);
  });

  it("returns false for non-string primitives", () => {
    expect(isSocialSearchSuggestionKind(0)).toBe(false);
    expect(isSocialSearchSuggestionKind(123)).toBe(false);
    expect(isSocialSearchSuggestionKind(false)).toBe(false);
    expect(isSocialSearchSuggestionKind(true)).toBe(false);
  });

  it("returns false for objects", () => {
    expect(isSocialSearchSuggestionKind({})).toBe(false);
    expect(isSocialSearchSuggestionKind({ kind: "user" })).toBe(false);
    expect(isSocialSearchSuggestionKind([])).toBe(false);
    expect(isSocialSearchSuggestionKind(["user"])).toBe(false);
  });

  it("narrows the type correctly", () => {
    const value: unknown = "user";
    if (isSocialSearchSuggestionKind(value)) {
      // TypeScript should know `value` is `SocialSearchSuggestionKind` here
      const _kind: SocialSearchSuggestionKind = value;
      expect(_kind).toBe("user");
    }
  });
});

describe("DEFENSIVE_FALLBACK_TESTID", () => {
  it("equals the documented testid", () => {
    expect(DEFENSIVE_FALLBACK_TESTID).toBe("social-search-unsupported-kind");
  });
});

describe("DISCOVERY_DISCRIMINATOR_INVARIANTS frozen catalogue", () => {
  it("exposes every constant", () => {
    expect(DISCOVERY_DISCRIMINATOR_INVARIANTS.defensiveFallbackTestId).toBe(
      DEFENSIVE_FALLBACK_TESTID,
    );
    expect(Array.isArray(DISCOVERY_DISCRIMINATOR_INVARIANTS.documentedKinds)).toBe(
      true,
    );
    expect(
      DISCOVERY_DISCRIMINATOR_INVARIANTS.documentedKinds.length,
    ).toBeGreaterThan(0);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(DISCOVERY_DISCRIMINATOR_INVARIANTS)).toBe(true);
  });
});
