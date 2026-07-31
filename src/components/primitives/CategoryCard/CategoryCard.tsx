'use client'

/**
 * <CategoryCard /> — the resolved visual representation of a CategoryResponseDto.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.E1.
 *
 * Renders cover image (with deterministic initials fallback when absent),
 * name (clamped to two lines), description (collapsed when absent), and
 * a metadata row. The whole card is wrapped in a Next.js <Link> to
 * `/categories/[slug|id]`.
 *
 * Drift notes (from TKT-3.1.A1 evidence):
 *   - The SDK exposes `CategoryResponseDto` (not `CategoryDto`).
 *   - The id field is `categoryId` (not `id`).
 *   - The CategoryResponseDto top-level fields available here: name,
 *     slug, description, imageUrl, createdAt, updatedAt.
 *   - `quizCount` and `parent` are NOT present at the top level; the
 *     primitive therefore renders the four blocks (cover, name, body,
 *     metadata) without quizCount and without a parent-category
 *     indicator. Both can be added in a follow-up if a future endpoint
 *     (e.g. `CategoryControllerGetCategoryAnalytics`) provides them.
 */

import Link from 'next/link'

import { cn } from '@/shared/utils/merge-class-names'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

const CARD_OUTER =
  'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:shadow-md'
const COVER_BASE =
  'relative aspect-[4/3] w-full overflow-hidden bg-muted'
const COVER_IMG = 'h-full w-full object-cover'
const COVER_FALLBACK =
  'flex h-full w-full items-center justify-center text-2xl font-semibold uppercase text-muted-foreground'
const BODY = 'flex flex-1 flex-col gap-2 p-4'
const NAME = 'line-clamp-2 text-base font-semibold leading-snug'
const DESCRIPTION = 'line-clamp-2 text-sm text-muted-foreground'
const META_ROW =
  'mt-auto flex items-center gap-2 text-xs text-muted-foreground'

function initialsFromCategory(category: CategoryResponseDto): string {
  const seed = category.categoryId.replace(/-/g, '').slice(-6)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const a = chars[hash % chars.length]
  const b = chars[(hash >>> 8) % chars.length]
  return `${a}${b}`
}

export interface CategoryCardProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  category: CategoryResponseDto
  className?: string
}

export function CategoryCard({ category, className, ...rest }: CategoryCardProps) {
  const href = `/categories/${category.slug || category.categoryId}`

  return (
    <Link
      href={href}
      className={cn(CARD_OUTER, className)}
      aria-label={category.name}
      data-testid='category-card'
      data-category-id={category.categoryId}
      data-category-slug={category.slug}
      {...rest}
    >
      <div className={COVER_BASE}>
        {category.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.imageUrl}
            alt=''
            loading='lazy'
            className={COVER_IMG}
          />
        ) : (
          <span aria-hidden='true' className={COVER_FALLBACK}>
            {initialsFromCategory(category)}
          </span>
        )}
      </div>
      <div className={BODY}>
        <h3 className={NAME}>{category.name}</h3>
        {category.description ? (
          <p className={DESCRIPTION}>{category.description}</p>
        ) : null}
        <div className={META_ROW}>
          <span className='tabular-nums'>/{category.slug}</span>
        </div>
      </div>
    </Link>
  )
}