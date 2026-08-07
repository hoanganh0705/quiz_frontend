/**
 * `is-cursor-page.ts` — runtime type-guards for the cursor / offset
 * page shapes consumed by `useCursorPaginated`.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive.
 * Source tickets: TKT-3.2.C1 (this file) + TKT-7.5 cleanup,
 *                 Phase 5 / P0-20.
 *
 * ## Purpose
 *
 * The previous implementation in `use-cursor-paginated.ts` used
 * `Object.prototype.hasOwnProperty.call(...)` to discriminate
 * `CursorPage<T>` from `OffsetPage<T>`. The check is structurally
 * loose: any object that happens to carry a `nextCursor` property
 * (a typed-error payload, an axios interceptor response wrapper,
 * etc.) passes the cursor guard even though it does not satisfy the
 * documented contract.
 *
 * TKT-7.5 cleanup, Phase 5 / P0-20 promotes the checks to strict
 * runtime type guards. The guards:
 *
 *   - Reject primitive payloads (numbers, strings, null, undefined).
 *   - Reject empty objects (an object with `nextCursor` / `page` but
 *     no `items` / `hasNextPage` / `hasMore` is a malformed envelope,
 *     not a page).
 *   - Reject objects whose discriminators carry the wrong type (a
 *     `nextCursor: number` is not a `CursorPage`).
 *   - Are exported as `(value): value is CursorPage<T>` predicates so
 *     callers can narrow without an `as` cast.
 *
 * The exhaustive `assertPageShape` helper throws a descriptive
 * `TypeError` for unknown shapes, surfacing malformed wire responses
 * with a Sentry breadcrumb in the caller.
 */

import type { CursorPage, OffsetPage } from "./use-cursor-paginated.types";

// ─── Cursor page guard ─────────────────────────────────────────────────

/**
 * Strict runtime guard for `CursorPage<T>`. Returns `true` when the
 * payload satisfies the documented contract:
 *
 *   - `items` is an array (may be empty).
 *   - `nextCursor` is either `string` or `null`.
 *   - `hasNextPage` is a boolean.
 *   - `limit` is a non-negative finite number.
 *
 * The guard deliberately does NOT check `T` (the generic is erased
 * at runtime). Callers narrow the item shape via their fetcher.
 */
export function isCursorPage<T extends { id: string }>(
  value: unknown,
): value is CursorPage<T> {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) return false;
  if (candidate.nextCursor !== null && typeof candidate.nextCursor !== "string") {
    return false;
  }
  if (typeof candidate.hasNextPage !== "boolean") return false;
  if (
    typeof candidate.limit !== "number" ||
    !Number.isFinite(candidate.limit) ||
    candidate.limit < 0
  ) {
    return false;
  }
  return true;
}

// ─── Offset page guard ──────────────────────────────────────────────────

/**
 * Strict runtime guard for `OffsetPage<T>`. Returns `true` when the
 * payload satisfies the documented contract:
 *
 *   - `items` is an array (may be empty).
 *   - `page` is a positive integer.
 *   - `total` is a non-negative integer.
 *   - `hasMore` is a boolean.
 *   - `limit` is a non-negative finite number.
 */
export function isOffsetPage<T extends { id: string }>(
  value: unknown,
): value is OffsetPage<T> {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) return false;
  if (
    typeof candidate.page !== "number" ||
    !Number.isInteger(candidate.page) ||
    candidate.page < 1
  ) {
    return false;
  }
  if (
    typeof candidate.total !== "number" ||
    !Number.isInteger(candidate.total) ||
    candidate.total < 0
  ) {
    return false;
  }
  if (typeof candidate.hasMore !== "boolean") return false;
  if (
    typeof candidate.limit !== "number" ||
    !Number.isFinite(candidate.limit) ||
    candidate.limit < 0
  ) {
    return false;
  }
  return true;
}

// ─── Discriminated union guard ──────────────────────────────────────────

/**
 * Returns `true` when the payload is either a `CursorPage` or an
 * `OffsetPage`. Use this guard when the caller accepts either shape
 * and the `paginationKind` is the discriminator.
 */
export function isAnyCursorLikePage<T extends { id: string }>(
  value: unknown,
): value is CursorPage<T> | OffsetPage<T> {
  return isCursorPage<T>(value) || isOffsetPage<T>(value);
}

// ─── Assertion helper ──────────────────────────────────────────────────

/**
 * Throw a descriptive `TypeError` when the page shape is unknown.
 * Used by the `useCursorPaginated` runtime to surface malformed
 * wire responses with a useful error message.
 */
export function assertPageShape<T extends { id: string }>(
  value: unknown,
  paginationKind: "cursor" | "offset",
): CursorPage<T> | OffsetPage<T> {
  if (paginationKind === "cursor" && isCursorPage<T>(value)) return value;
  if (paginationKind === "offset" && isOffsetPage<T>(value)) return value;
  const observed = describeShape(value);
  throw new TypeError(
    `[useCursorPaginated] expected a ${paginationKind}-shaped page but received ${observed}`,
  );
}

function describeShape(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value !== "object") return `primitive ${typeof value}`;
  try {
    const candidate = value as Record<string, unknown>;
    const keys = Object.keys(candidate).sort();
    return `object { ${keys.slice(0, 8).join(", ")}${
      keys.length > 8 ? ", …" : ""
    } }`;
  } catch {
    return "object";
  }
}