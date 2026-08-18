

import { describe, expect, it } from "vitest";

import { isUuid } from "@/features/social/utils/is-uuid";

describe("isUuid", () => {
it("accepts the canonical UUID v4 shape (lower-case)", () => {
expect(isUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
  });

it("accepts the canonical UUID v4 shape (upper-case)", () => {
expect(isUuid("ABCDEF12-3456-4789-ABCD-EF1234567890")).toBe(true);
  });

it("accepts a mixed-case UUID", () => {
expect(isUuid("AbCdEf12-3456-4000-8000-123456789012")).toBe(true);
  });

it("rejects empty strings", () => {
expect(isUuid("")).toBe(false);
  });

it("rejects non-UUID-shaped strings", () => {
expect(isUuid("not-a-uuid")).toBe(false);
expect(isUuid("12345")).toBe(false);
expect(isUuid("00000000-0000-4000-8000-00000000000")).toBe(false);
expect(isUuid("00000000-0000-4000-8000-0000000000000")).toBe(false);
expect(isUuid("00000000000040008000000000000000")).toBe(false); // no dashes
  });

it("rejects null and undefined", () => {
expect(isUuid(null)).toBe(false);
expect(isUuid(undefined)).toBe(false);
  });
});
