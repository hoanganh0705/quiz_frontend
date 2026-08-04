/**
 * DTO adapter functions for Phase 5 API responses.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.C2.
 *
 * ## Purpose
 *
 * Phase 5 features call SDK functions whose responses may arrive in one of
 * several shapes:
 *
 *   (a) Bare arrays — some endpoints return `T[]` instead of a paginated
 *       envelope (see master plan §1.3 line 61, backend warning for badge
 *       endpoints).
 *   (b) Mixed pagination — some endpoints use cursor pagination, others use
 *       offset pagination; both arrive in the same `{ data, meta }` envelope.
 *   (c) Nullable singletons — endpoints that return a single entity may
 *       return `null` at the type level.
 *
 * The adapters below normalise all three cases to a stable internal shape
 * so downstream service wrappers never need to branch on raw response shape.
 *
 * ## No-op design
 *
 * Every adapter is a total function: it never throws. Null, undefined, and
 * wrong-kind inputs return a stable empty result. Callers can use the
 * returned value without additional null guards.
 *
 * ## Cursor vs. offset pagination
 *
 * Both pagination styles share the same top-level envelope:
 *
 *   { data: T[], meta: { pagination: { kind: 'cursor' | 'offset', ... } } }
 *
 * `normalizePaginated` preserves the `kind` discriminator and returns the
 * items in the same order as the backend. Callers that need cursor-based
 * pagination (e.g., "load more" buttons) should read `nextCursor`; callers
 * using offset pagination should read `meta.pagination.page` from the raw
 * SDK response instead.
 */

// ─── normalizeArray ────────────────────────────────────────────────────────────

/**
 * Normalises a potentially-null array to a guaranteed array.
 *
 * @param input - A value that may be `T[]`, `null`, or `undefined`.
 * @returns `input ?? []` — an empty array when input is nullish.
 *
 * @example
 * const badges = normalizeArray(rawBadges);  // string[]
 * // badges is always an array; no guard needed
 */
export function normalizeArray<T>(input: T[] | null | undefined): T[] {
  if (!input) return [];
  return input;
}

// ─── normalizePaginated ────────────────────────────────────────────────────────

/**
 * Shape produced by cursor-paginated SDK responses.
 */
export interface CursorPaginatedResult<T> {
  items: T[];
  paginationKind: "cursor";
  nextCursor?: string;
}

/**
 * Shape produced by offset-paginated SDK responses.
 */
export interface OffsetPaginatedResult<T> {
  items: T[];
  paginationKind: "offset";
}

/**
 * Union of all normalised paginated shapes.
 */
export type NormalizedPaginatedResult<T> =
  | CursorPaginatedResult<T>
  | OffsetPaginatedResult<T>;

/**
 * Normalises a paginated response envelope that may be nullish.
 *
 * @param input - A paginated response or `null` / `undefined`.
 * @returns A normalised result with `items: T[]` and a `paginationKind`
 *   discriminator.
 *
 * The `kind` field comes from `meta.pagination.kind` in the raw response.
 * Callers needing cursor metadata (e.g., the `nextCursor` string) should
 * read `meta.pagination.nextCursor` from the raw SDK response directly —
 * this adapter does not extract it to avoid duplicating the meta shape.
 *
 * @example
 * const result = normalizePaginated(rawResponse);
 * if (result.paginationKind === 'cursor') {
 *   // use nextCursor from raw response meta
 * }
 * for (const item of result.items) { ... }
 */
export function normalizePaginated<T>(
  input:
    | { data: T[]; meta: { pagination: { kind: "cursor" | "offset" } } }
    | null
    | undefined,
): NormalizedPaginatedResult<T> {
  if (!input) return { items: [], paginationKind: "offset" };

  const kind = input.meta?.pagination?.kind ?? "offset";
  return {
    items: Array.isArray(input.data) ? input.data : [],
    paginationKind: kind,
  };
}

// ─── normalizeSingle ───────────────────────────────────────────────────────────

/**
 * Narrows a potentially-null singleton to `T | null`.
 *
 * This exists primarily to make TypeScript happy — the SDK may generate
 * union types like `Badge | null | undefined`, and callers need a
 * convenient shorthand for "coalesce undefined to null".
 *
 * @param input - A value that may be `T`, `null`, or `undefined`.
 * @returns `input ?? null` — `null` when input is nullish.
 */
export function normalizeSingle<T>(input: T | null | undefined): T | null {
  return input ?? null;
}

// ─── normalizeBadgeArray ───────────────────────────────────────────────────────

/**
 * Normalised badge shape used internally by Phase 5 services.
 *
 * Until the backend confirms the exact badge response shape (master plan
 * §1.3 line 61), this interface documents the fields that the frontend
 * expects. Missing or extra fields are preserved via `Record` spillover.
 */
export interface NormalizedBadge {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  earnedAt?: string; // ISO 8601, present only when badge is earned
  progress?: number; // 0–100
  [extra: string]: unknown; // Backend may add fields not yet modelled
}

/**
 * Normalises a raw badge array from the backend.
 *
 * BACKEND_WARNING: The backend may return a bare array for some badge
 * endpoints instead of a paginated envelope. This adapter wraps the bare
 * array and documents the known fields.
 *
 * ```ts
 * // TODO(backend): remove adapter once backend returns paginated response
 * // (see master plan §1.3 line 61)
 * ```
 *
 * @param input - A bare badge array or `null` / `undefined`.
 * @returns A `NormalizedBadge[]`, falling back to `[]` for nullish input.
 */
export function normalizeBadgeArray(
  input: unknown[] | null | undefined,
): NormalizedBadge[] {
  if (!input || !Array.isArray(input)) return [];

  return input.map((item): NormalizedBadge => {
    if (typeof item !== "object" || item === null) {
      return { id: String(item), name: String(item) };
    }
    const record = item as Record<string, unknown>;
    return {
      id: typeof record.id === "string" ? record.id : "?",
      name: typeof record.name === "string" ? record.name : "?",
      description:
        typeof record.description === "string" ? record.description : undefined,
      iconUrl: typeof record.iconUrl === "string" ? record.iconUrl : undefined,
      earnedAt:
        typeof record.earnedAt === "string" ? record.earnedAt : undefined,
      progress:
        typeof record.progress === "number" ? record.progress : undefined,
      ...record, // spillover for fields not yet modelled
    };
  });
}
