/**
 * `rankedCategoryToCategoryResponse` — adapter from the
 * `RankedCategoryResponseDto` (the wire shape returned by
 * `/categories/popular` and `/categories/trending`) to the
 * `CategoryResponseDto` shape the Story 3.1 `CategoryCard` primitive
 * expects.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.C1 + TKT-3.3.D2 followups.
 *
 * ## Drift background (Epic 3.3 A1 §3)
 *
 * The ranked / trending endpoints return `RankedCategoryResponseDto`,
 * which is structurally lighter than `CategoryResponseDto`:
 *
 *   - no `createdAt` / `updatedAt`
 *   - uses `categoryId` (consistent with the rest of the SDK; the
 *     primitive already handles this)
 *   - has `rank`, `totalScore`, `totalAttempts` instead of the
 *     full category fields
 *
 * The Story 3.1 `CategoryCard` primitive reads only `categoryId`,
 * `name`, `slug`, `description`, and `imageUrl` (per
 * `src/components/primitives/CategoryCard/CategoryCard.tsx`). The
 * adapter synthesises `createdAt` / `updatedAt` as empty strings —
 * the primitive never reads them, so the empty-string sentinel is
 * safe.
 *
 * The mapper is a leaf helper — no React, no I/O, no SWR — and is
 * trivial to unit-test in the future if needed.
 */

import type {
  CategoryResponseDto,
  RankedCategoryResponseDto,
} from '@/lib/api/generated/schemas'

export function rankedCategoryToCategoryResponse(
  ranked: RankedCategoryResponseDto,
): CategoryResponseDto {
  return {
    categoryId: ranked.categoryId,
    name: ranked.name,
    slug: ranked.slug,
    description: ranked.description ?? null,
    imageUrl: ranked.imageUrl ?? null,
    createdAt: '',
    updatedAt: '',
  }
}
