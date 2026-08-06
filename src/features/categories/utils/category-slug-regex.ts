/**
 * Single source of truth for the category slug regex.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.A3 (Phase 3 slug regex); extended by Epic 7.4
 *               (TKT-7.4.B2) for the admin surface re-export.
 *
 * The regex mirrors the server-side constraint documented on the
 * `createCategoryDto.slug` and `updateCategoryDto.slug` fields as
 * `@pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$`
 * (verified against `src/lib/api/generated/schemas/createCategoryDto.ts`
 * and `updateCategoryDto.ts`). It is identical to the Phase 3 tag slug
 * regex (TKT-3.4.A3) so the same kebab-case shape applies to both
 * admin-managed entities.
 *
 * The frontend must mirror the regex verbatim so the client-side form
 * never sends a value the server would reject (closing Story 7.4 AC
 * "category form never causes a 422" — the slug-availability hook
 * surfaces `CATEGORY_SLUG_CONFLICT` only for *valid* slugs that are
 * taken; an invalid slug never reaches the server).
 *
 * Drift candidate: a future Epic 4 phase may add the `pattern`
 * attribute to the OpenAPI spec for the category endpoints — when
 * that lands, the on-disk regex here remains the source of truth
 * (the backend swagger decorator will be regenerated from the same
 * NestJS pipe).
 */
export const CATEGORY_SLUG_REGEX: RegExp =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Returns `true` if `value` is a valid category slug per the regex.
 *
 * Accepts only kebab-case lowercase letters and digits. Empty
 * strings, uppercase letters, spaces, underscores, dots, and
 * non-ASCII characters all return `false`.
 */
export function isValidCategorySlug(value: string): boolean {
  return CATEGORY_SLUG_REGEX.test(value);
}