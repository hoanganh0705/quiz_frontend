/**
 * `features/admin/tag-admin/tag-slug-regex.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.B2.
 *
 * ## Purpose
 *
 * Single module for tag admin slug utilities. Provides:
 *   1. Re-exports of the Phase 3 canonical regex and validator.
 *   2. `deriveTagSlug` — a name-to-slug derivation helper that mirrors
 *      the backend's `trimStringToLowerCase` + slug normalisation logic.
 *
 * ## Re-export contract
 *
 * `TAG_SLUG_REGEX` and `isValidTagSlug` are re-exported verbatim from
 * `features/tags/utils/tag-slug-regex.ts` (Phase 3, TKT-3.4.A3). They
 * must remain byte-identical to the source. If the Phase 3 source
 * changes, update the re-export here.
 */

export {
  /** Canonical tag-slug regex from Phase 3 (TKT-3.4.A3). */
  TAG_SLUG_REGEX,
  /** Validates a string against `TAG_SLUG_REGEX`. */
  isValidTagSlug,
} from '@/features/tags/utils/tag-slug-regex';

// ─── Name-to-slug derivation ─────────────────────────────────────────────────

/**
 * Converts a human-readable tag name into a kebab-case slug.
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
 * This mirrors the backend's `trimStringToLowerCase` convention used in
 * `quiz_backend/src/modules/tag/dto/request/create-tag.dto.ts`.
 *
 * **Authoritative source:** The server is always the final arbiter of a
 * valid slug. Use this helper as a client-side UX affordance only.
 *
 * @param name - The human-readable tag name (e.g. `"Café Latté"`)
 * @returns A kebab-case slug (e.g. `"cafe-latte"`)
 */
export function deriveTagSlug(name: string): string {
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
