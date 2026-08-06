/**
 * `features/admin/category-admin/category-slug-regex.ts`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.B2.
 *
 * ## Purpose
 *
 * Single module for category admin slug utilities. Provides:
 *   1. Re-exports of the Phase 3 canonical regex and validator.
 *   2. `deriveCategorySlug` — a name-to-slug derivation helper that
 *      mirrors the backend's `trimStringToLowerCase` + slug
 *      normalisation logic.
 *
 * ## Re-export contract
 *
 * `CATEGORY_SLUG_REGEX` and `isValidCategorySlug` are re-exported
 * verbatim from `features/categories/utils/category-slug-regex.ts`
 * (Phase 3, TKT-3.3.A3 — established here as a structural prerequisite
 * because the file did not yet exist). They must remain byte-identical
 * to the source. If the Phase 3 source changes, update the re-export
 * here.
 */

export {
  /** Canonical category-slug regex from Phase 3 (TKT-3.3.A3). */
  CATEGORY_SLUG_REGEX,
  /** Validates a string against `CATEGORY_SLUG_REGEX`. */
  isValidCategorySlug,
} from '@/features/categories/utils/category-slug-regex';

// ─── Name-to-slug derivation ─────────────────────────────────────────────────

/**
 * Converts a human-readable category name into a kebab-case slug.
 *
 * Transformation pipeline:
 *   1. Normalise to NFD form (decompose composite characters).
 *   2. Strip combining diacritical marks (accents, tildes, etc.).
 *   3. Lowercase.
 *   4. Replace runs of whitespace and underscores with `-`.
 *   5. Strip any remaining non-alphanumeric characters.
 *   6. Collapse consecutive `-` runs.
 *   7. Trim leading and trailing `-`.
 *
 * Mirrors `deriveTagSlug` (Epic 7.3, TKT-7.3.B2). The backend mirrors
 * this logic in its `createCategory` / `updateCategory` DTO
 * normalisers — see `quiz_backend/src/modules/category/dto/request/`.
 *
 * **Authoritative source:** The server is always the final arbiter of
 * a valid slug. Use this helper as a client-side UX affordance only.
 *
 * @param name - The human-readable category name (e.g. `"Café Latté"`)
 * @returns A kebab-case slug (e.g. `"cafe-latte"`)
 */
export function deriveCategorySlug(name: string): string {
  return (
    name
      // Step 1-2: Decompose and strip diacritical marks.
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Step 3: Lowercase.
      .toLowerCase()
      // Step 4: Replace whitespace / underscore with `-`.
      .replace(/[\s_]+/g, '-')
      // Step 5: Strip anything that is not a letter, digit, or hyphen.
      .replace(/[^a-z0-9-]/g, '')
      // Step 6: Collapse consecutive hyphens.
      .replace(/-{2,}/g, '-')
      // Step 7: Trim leading / trailing hyphens.
      .replace(/^-+|-+$/g, '')
  );
}