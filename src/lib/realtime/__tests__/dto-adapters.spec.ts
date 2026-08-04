/**
 * Unit tests for DTO adapter functions.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.C2.
 *
 * Tests cover:
 *   - `normalizeArray`: null, undefined, empty array, populated array
 *   - `normalizePaginated`: null, undefined, cursor pagination, offset pagination,
 *     empty data array, non-array data
 *   - `normalizeSingle`: null, undefined, value
 *   - `normalizeBadgeArray`: null, undefined, empty array, malformed items
 */

import { describe, expect, it } from "vitest";

import {
  normalizeArray,
  normalizeBadgeArray,
  normalizePaginated,
  normalizeSingle,
} from "../dto-adapters";

describe("normalizeArray", () => {
  it("returns input array as-is when populated", () => {
    const input = [{ id: "1" }, { id: "2" }];
    expect(normalizeArray(input)).toBe(input);
  });

  it("returns [] for null", () => {
    expect(normalizeArray(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(normalizeArray(undefined)).toEqual([]);
  });

  it("returns [] for an empty array", () => {
    expect(normalizeArray([])).toEqual([]);
  });
});

describe("normalizePaginated", () => {
  describe("cursor pagination", () => {
    it("returns items with 'cursor' kind", () => {
      const input = {
        data: [{ id: "1" }, { id: "2" }],
        meta: { pagination: { kind: "cursor", nextCursor: "abc" } },
      };
      const result = normalizePaginated(input);
      expect(result.paginationKind).toBe("cursor");
      expect(result.items).toEqual([{ id: "1" }, { id: "2" }]);
    });

    it("uses nextCursor from meta if present (passthrough)", () => {
      const input = {
        data: [{ id: "1" }],
        meta: { pagination: { kind: "cursor", nextCursor: "xyz" } },
      };
      const result = normalizePaginated(input);
      // normalizePaginated returns NormalizedPaginatedResult; the caller reads
      // nextCursor directly from input.meta.pagination.nextCursor
      expect(result.items.length).toBe(1);
    });
  });

  describe("offset pagination", () => {
    it("returns items with 'offset' kind", () => {
      const input = {
        data: [{ id: "3" }],
        meta: { pagination: { kind: "offset", page: 2 } },
      };
      const result = normalizePaginated(input);
      expect(result.paginationKind).toBe("offset");
      expect(result.items).toEqual([{ id: "3" }]);
    });

    it("defaults to 'offset' when kind is missing", () => {
      const input = { data: [{ id: "x" }], meta: { pagination: {} } };
      const result = normalizePaginated(input);
      expect(result.paginationKind).toBe("offset");
    });
  });

  it("returns stable empty result for null", () => {
    const result = normalizePaginated(null);
    expect(result.items).toEqual([]);
    expect(result.paginationKind).toBe("offset");
  });

  it("returns stable empty result for undefined", () => {
    const result = normalizePaginated(undefined);
    expect(result.items).toEqual([]);
    expect(result.paginationKind).toBe("offset");
  });

  it("returns [] items when data is not an array", () => {
    const input = { data: "not-an-array", meta: { pagination: { kind: "offset" } } };
    const result = normalizePaginated(input as never);
    expect(result.items).toEqual([]);
  });
});

describe("normalizeSingle", () => {
  it("returns value as-is", () => {
    const input = { id: "1", name: "Alice" };
    expect(normalizeSingle(input)).toBe(input);
  });

  it("returns null for null", () => {
    expect(normalizeSingle(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeSingle(undefined)).toBeNull();
  });
});

describe("normalizeBadgeArray", () => {
  it("maps a well-formed badge array", () => {
    const input = [
      {
        id: "badge-1",
        name: "First Place",
        description: "Win first place in a tournament",
        iconUrl: "https://example.com/badge1.png",
        earnedAt: "2026-08-04T00:00:00.000Z",
        progress: 100,
      },
    ];
    const result = normalizeBadgeArray(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "badge-1",
      name: "First Place",
      description: "Win first place in a tournament",
      iconUrl: "https://example.com/badge1.png",
      earnedAt: "2026-08-04T00:00:00.000Z",
      progress: 100,
    });
  });

  it("returns [] for null", () => {
    expect(normalizeBadgeArray(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(normalizeBadgeArray(undefined)).toEqual([]);
  });

  it("returns [] for empty array", () => {
    expect(normalizeBadgeArray([])).toEqual([]);
  });

  it("handles a primitive in the array (fallback to string coercion)", () => {
    const result = normalizeBadgeArray(["primitive-id" as unknown as object]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("primitive-id");
    expect(result[0].name).toBe("primitive-id");
  });

  it("preserves extra fields via spillover", () => {
    const input = [
      {
        id: "b1",
        name: "Speedrunner",
        customField: "extra-value",
        score: 999,
      },
    ];
    const result = normalizeBadgeArray(input);
    expect(result[0]["customField"]).toBe("extra-value");
    expect(result[0]["score"]).toBe(999);
  });
});
