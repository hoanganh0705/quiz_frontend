

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
