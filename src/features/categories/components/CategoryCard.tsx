/**
 * `<CategoryCard />` — the consumer wrapper for the Feature 3.3
 * category surfaces.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.C1.
 *
 * This is a 1:1 adapter over the Story 3.1 `<CategoryCard />`
 * primitive. The wrapper exists so that:
 *
 *   1. Feature consumers import from `@/features/categories` (the
 *      feature's public API surface) instead of the primitives
 *      barrel. A future rename of the primitive (or a fork between
 *      the directory-card and the "Related categories" surface) is
 *      contained in this file.
 *   2. The legacy `Category` type alias (`CategoryResponseDto`) does
 *      not need to be propagated to every call site — the wrapper
 *      accepts the same shape as the primitive.
 *
 * URL key (Story 3.3 line 349): `slug` if present, else `categoryId`.
 * The primitive already implements this rule (`category.slug || category.categoryId`).
 *
 * The component is server-renderable — no `'use client'` directive —
 * because the primitive itself does not require a client. The
 * directory and detail pages (D2, D3) are client components because
 * they consume the SWR hooks; the card itself is a pure prop-driven
 * renderer.
 */

import { CategoryCard as CategoryCardPrimitive } from '@/components/primitives'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

export interface CategoryCardProps {
  category: CategoryResponseDto
  className?: string
}

export function CategoryCard({
  category,
  className,
}: CategoryCardProps): React.ReactElement {
  return (
    <CategoryCardPrimitive category={category} className={className} />
  )
}
