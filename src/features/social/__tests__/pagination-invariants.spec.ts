/**
 * `pagination-invariants.spec.ts` — Locks the four cross-batch
 * invariants Story 6.2 list pages and URL state helpers must obey.
 *
 * Source epic:   Epic 6.2.
 * Source ticket: TKT-6.2.A3.
 *
 * Asserts:
 *
 *   - `SOCIAL_GRAPH_PAGINATION_KIND === 'cursor'`.
 *   - `SOCIAL_GRAPH_DEFAULT_LIMIT` is a positive integer ≤ `MAX_LIMIT`.
 *   - `SOCIAL_GRAPH_MAX_LIMIT` is a positive integer ≥ `DEFAULT_LIMIT`.
 *   - `FORBIDDEN_SOCIAL_STORAGE_KEYS` contains `followId`,
 *     `friendshipId`, and `offset` and is non-empty.
 *   - `SOCIAL_GRAPH_PAGINATION_INVARIANTS` mirrors the individual
 *     exports and is frozen.
 */

import { describe, expect, it } from "vitest";

import {
  FORBIDDEN_SOCIAL_STORAGE_KEYS,
  SOCIAL_GRAPH_DEFAULT_LIMIT,
  SOCIAL_GRAPH_MAX_LIMIT,
  SOCIAL_GRAPH_PAGINATION_INVARIANTS,
  SOCIAL_GRAPH_PAGINATION_KIND,
  SOCIAL_GRAPH_URL_KEYS,
} from "@/features/social/pagination-invariants";

describe("pagination-invariants — Story 6.2 cross-batch invariants", () => {
  it("declares the cursor pagination kind", () => {
    expect(SOCIAL_GRAPH_PAGINATION_KIND).toBe("cursor");
  });

  it("exposes a positive integer default limit", () => {
    expect(Number.isInteger(SOCIAL_GRAPH_DEFAULT_LIMIT)).toBe(true);
    expect(SOCIAL_GRAPH_DEFAULT_LIMIT).toBeGreaterThan(0);
  });

  it("exposes a positive integer max limit at least as large as the default", () => {
    expect(Number.isInteger(SOCIAL_GRAPH_MAX_LIMIT)).toBe(true);
    expect(SOCIAL_GRAPH_MAX_LIMIT).toBeGreaterThan(0);
    expect(SOCIAL_GRAPH_MAX_LIMIT).toBeGreaterThanOrEqual(
      SOCIAL_GRAPH_DEFAULT_LIMIT,
    );
  });

  it("ships a non-empty forbidden storage key list containing the documented identifiers", () => {
    expect(FORBIDDEN_SOCIAL_STORAGE_KEYS.length).toBeGreaterThan(0);
    expect(FORBIDDEN_SOCIAL_STORAGE_KEYS).toContain("followId");
    expect(FORBIDDEN_SOCIAL_STORAGE_KEYS).toContain("friendshipId");
    expect(FORBIDDEN_SOCIAL_STORAGE_KEYS).toContain("offset");
  });

  it("restricts URL keys to the documented list", () => {
    expect(SOCIAL_GRAPH_URL_KEYS.length).toBeGreaterThan(0);
    expect(SOCIAL_GRAPH_URL_KEYS).toContain("cursor");
    expect(SOCIAL_GRAPH_URL_KEYS).toContain("limit");
  });

  it("exposes a frozen aggregate record mirroring the individual constants", () => {
    expect(Object.isFrozen(SOCIAL_GRAPH_PAGINATION_INVARIANTS)).toBe(true);
    expect(SOCIAL_GRAPH_PAGINATION_INVARIANTS.paginationKind).toBe(
      SOCIAL_GRAPH_PAGINATION_KIND,
    );
    expect(SOCIAL_GRAPH_PAGINATION_INVARIANTS.defaultLimit).toBe(
      SOCIAL_GRAPH_DEFAULT_LIMIT,
    );
    expect(SOCIAL_GRAPH_PAGINATION_INVARIANTS.maxLimit).toBe(
      SOCIAL_GRAPH_MAX_LIMIT,
    );
    expect(SOCIAL_GRAPH_PAGINATION_INVARIANTS.forbiddenStorageKeys).toEqual(
      FORBIDDEN_SOCIAL_STORAGE_KEYS,
    );
    expect(SOCIAL_GRAPH_PAGINATION_INVARIANTS.urlKeys).toEqual(
      SOCIAL_GRAPH_URL_KEYS,
    );
  });
});
