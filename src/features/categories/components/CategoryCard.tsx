
import { CategoryCard as CategoryCardPrimitive } from '@/components/primitives'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

export interface CategoryCardProps {
  category: CategoryResponseDto
  className?: string
  titleHeadingLevel?: 2 | 3 | 4
}

export function CategoryCard({
  category,
  className,
  titleHeadingLevel,
}: CategoryCardProps): React.ReactElement {
  return (
    <CategoryCardPrimitive
      category={category}
      className={className}
      titleHeadingLevel={titleHeadingLevel}
    />
  )
}
