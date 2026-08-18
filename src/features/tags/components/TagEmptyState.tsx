

import { SearchX, Tag as TagIcon } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'

export type TagEmptyStateVariant =
| 'directory'
  | 'quizzes-by-tag'
  | 'filter-no-match'

export interface TagEmptyStateProps {
variant: TagEmptyStateVariant

query?: string

onClearFilter?: () => void

className?: string
}

interface StaticCopy {
title: string
description: string
icon: typeof TagIcon
}

const STATIC_COPY: Record<
Exclude<TagEmptyStateVariant, 'filter-no-match'>,
StaticCopy
> = {
directory: {
title: 'No tags yet.',
description: 'Tags will appear here once they are created.',
icon: TagIcon,
  },
'quizzes-by-tag': {
title: 'No quizzes tagged with this yet.',
description: 'Check back soon for new quizzes on this topic.',
icon: SearchX,
  },
}

export function TagEmptyState({
variant,
query,
onClearFilter,
className,
}: TagEmptyStateProps): React.ReactElement {
if (variant === 'filter-no-match') {

const safeQuery = query ?? ''
return (
<div
data-testid={`tag-empty-state-${variant}`}
data-variant={variant}
className={className}
      >
<EmptyState
icon={SearchX}
title={`No tags match '${safeQuery}'`}
description="Try a different keyword or clear the filter to see all tags."
actions={[
{
label: 'Clear filter',
variant: 'outline',
onClick: onClearFilter,
            },
          ]}
        />
</div>
    )
  }

const copy = STATIC_COPY[variant]
return (
<div
data-testid={`tag-empty-state-${variant}`}
data-variant={variant}
className={className}
    >
<EmptyState
icon={copy.icon}
title={copy.title}
description={copy.description}
      />
</div>
  )
}
