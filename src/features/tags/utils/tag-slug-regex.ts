/**
 * Single source of truth for the tag slug regex.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.A3.
 *
 * The regex is enforced server-side by the backend's
 * `ParseUUIDOrSlugPipe` (see `quiz_backend/src/common/pipes/parse-uuid-or-slug.pipe.ts`
 * line 5). It is NOT documented on the OpenAPI spec's `:slug` parameter
 * (TKT-3.4.A1 §2a records the drift). The frontend must mirror the
 * same regex verbatim so the client-side filter input never sends a
 * value the server would reject (closing Story 3.4 AC #3 — "filter
 * input never causes a 422").
 *
 * Drift candidate: a future Epic 4 phase may add the `pattern`
 * attribute to the OpenAPI spec — when that lands, the on-disk
 * regex here remains the source of truth (the backend swagger
 * decorator will be regenerated from the same NestJS pipe).
 */
export const TAG_SLUG_REGEX: RegExp =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Returns `true` if `value` is a valid tag slug per the regex.
 *
 * Accepts only kebab-case lowercase letters and digits. Empty
 * strings, uppercase letters, spaces, underscores, dots, and
 * non-ASCII characters all return `false`.
 */
export function isValidTagSlug(value: string): boolean {
  return TAG_SLUG_REGEX.test(value);
}
