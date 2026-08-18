

import { FolderOpen, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export type CategoryEmptyStateVariant =
| 'directory'
  | 'quizzes-in-category'

export interface CategoryEmptyStateProps {
variant: CategoryEmptyStateVariant

className?: string
}

const COPY: Record<
CategoryEmptyStateVariant,
{ title: string; description: string }
> = {
directory: {
title: 'No categories yet.',
description: 'Check back soon.',
  },
'quizzes-in-category': {
title: 'No quizzes in this category yet.',
description: 'Check back soon for new quizzes.',
  },
}

export function CategoryEmptyState({
variant,
className,
}: CategoryEmptyStateProps): React.ReactElement {
const copy = COPY[variant]
const Icon = variant === 'directory' ? FolderOpen : SearchX
return (
<div
data-testid={`category-empty-state-${variant}`}
data-variant={variant}
    >
<EmptyState
icon={Icon}
title={copy.title}
description={copy.description}
className={className}
      />
</div>
  )
}
