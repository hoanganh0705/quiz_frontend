

import type { CursorPage, OffsetPage } from "./use-cursor-paginated.types";

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

export function isAnyCursorLikePage<T extends { id: string }>(
value: unknown,
): value is CursorPage<T> | OffsetPage<T> {
return isCursorPage<T>(value) || isOffsetPage<T>(value);
}

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