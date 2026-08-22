'use client'
import { EntityCard } from '@/components/primitives/EntityCard'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

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

export interface CategoryCardProps {
  category: CategoryResponseDto;
  className?: string;
  titleHeadingLevel?: 2 | 3 | 4;
}

export function CategoryCard({
  category,
  className,
  titleHeadingLevel,
}: CategoryCardProps) {
  const href = `/categories/${category.slug || category.categoryId}`

  return (
    <EntityCard
      href={href}
      title={category.name}
      description={category.description}
      imageUrl={category.imageUrl}
      initials={initialsFromCategory(category)}
      aspectRatio='4/3'
      coverSize='lg'
      className={className}
      titleHeadingLevel={titleHeadingLevel}
      linkProps={{
        'data-testid': 'category-card',
        'data-category-id': category.categoryId,
        'data-category-slug': category.slug,
      }}
      meta={<span className='tabular-nums'>/{category.slug}</span>}
    />
  )
}