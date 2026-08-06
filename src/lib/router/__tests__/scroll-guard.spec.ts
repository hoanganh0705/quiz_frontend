/**
 * `scroll-guard.spec.ts` — Locks the URL-rejected-id guard
 * (TKT-6.5.G3).
 *
 * Tests the `matchesUnstableId` and `urlContainsUnstableId` functions,
 * which are the core logic of the guard.
 */

import { describe, expect, it } from "vitest";

import { matchesUnstableId, urlContainsUnstableId } from "@/lib/router/scroll-guard";

describe("matchesUnstableId", () => {
  describe("UUIDv4-shaped strings", () => {
    it("matches standard UUIDv4", () => {
      expect(matchesUnstableId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("matches UUIDv4 with uppercase", () => {
      expect(matchesUnstableId("6BA7B810-9DAD-41D1-80B4-00C04FD430C8")).toBe(true);
    });

    it("matches UUIDv4 with mixed case", () => {
      expect(matchesUnstableId("6ba7b810-9dad-41d1-80b4-00c04fd430c8")).toBe(true);
    });
  });

  describe("non-UUIDv4 strings", () => {
    it("does not match plain usernames", () => {
      expect(matchesUnstableId("johndoe")).toBe(false);
    });

    it("does not match user IDs", () => {
      expect(matchesUnstableId("123")).toBe(false);
    });

    it("does not match slugs", () => {
      expect(matchesUnstableId("my-quiz-slug")).toBe(false);
    });

    it("does not match UUIDv1", () => {
      expect(matchesUnstableId("550e8400-e29b-11d4-a716-446655440000")).toBe(false);
    });

    it("does not match UUIDv5", () => {
      expect(matchesUnstableId("550e8400-e29b-51d4-a716-446655440000")).toBe(false);
    });

    it("does not match incomplete UUID", () => {
      expect(matchesUnstableId("550e8400-e29b-41d4-a716")).toBe(false);
    });

    it("does not match empty string", () => {
      expect(matchesUnstableId("")).toBe(false);
    });
  });
});

describe("urlContainsUnstableId", () => {
  describe("safe URLs", () => {
    it("returns false for URLs without unstable IDs", () => {
      expect(urlContainsUnstableId("https://example.com/social")).toBe(false);
    });

    it("returns false for URLs with usernames", () => {
      expect(urlContainsUnstableId("https://example.com/profile/johndoe")).toBe(false);
    });

    it("returns false for URLs with slugs", () => {
      expect(urlContainsUnstableId("https://example.com/quizzes/my-quiz")).toBe(false);
    });

    it("returns false for URLs with numeric IDs", () => {
      expect(urlContainsUnstableId("https://example.com/quizzes/123")).toBe(false);
    });

    it("returns false for URLs with UUIDv1", () => {
      expect(
        urlContainsUnstableId(
          "https://example.com/social/users/550e8400-e29b-11d4-a716-446655440000",
        ),
      ).toBe(false);
    });
  });

  describe("unsafe URLs", () => {
    it("returns true for URLs with unstable ID in path segment", () => {
      expect(
        urlContainsUnstableId(
          "https://example.com/social/follow/550e8400-e29b-41d4-a716-446655440000",
        ),
      ).toBe(true);
    });

    it("returns true for deep path with unstable ID", () => {
      expect(
        urlContainsUnstableId(
          "https://example.com/a/b/c/550e8400-e29b-41d4-a716-446655440000/d/e",
        ),
      ).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles relative URLs", () => {
      expect(urlContainsUnstableId("/social/550e8400-e29b-41d4-a716-446655440000")).toBe(
        true,
      );
    });

    it("handles URLs with anchors", () => {
      expect(
        urlContainsUnstableId("https://example.com/social#section"),
      ).toBe(false);
    });
  });
});
