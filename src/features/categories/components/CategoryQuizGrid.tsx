'use client'

import { QuizCardGrid } from '@/components/primitives'
import { Button } from '@/components/ui/Button'
import { CategoryEmptyState } from './CategoryEmptyState'
import { useCategoryQuizzes } from '@/features/categories/hooks'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

export interface CategoryQuizGridProps {
idOrSlug: string
params?: { limit?: number }

skeletonCount?: number
}

export function CategoryQuizGrid({
idOrSlug,
params,
skeletonCount = 12,
}: CategoryQuizGridProps): React.ReactElement {
const {
items,
isLoading,
isLoadingMore,
hasMore,
loadMore,
error,
refresh,
retryBannerVisible,
  } = useCategoryQuizzes(idOrSlug, params ?? {})

if (isLoading) {
return (
<div data-testid='category-quiz-grid-loading'>
<QuizCardGrid skeletonCount={skeletonCount} />
</div>
    )
  }

if (error) {
return (
<div
className='text-center py-12'
role='alert'
data-testid='category-quiz-grid-error'
      >
<p className='text-destructive text-lg mb-4'>
{error.status && error.status >= 500
? 'Something went wrong on our end. Please try again.'
: 'Could not load quizzes for this category.'}
</p>
<Button
variant='outline'
onClick={() => void refresh()}
data-testid='category-quiz-grid-retry'
        >
Retry
        </Button>
</div>
    )
  }

if (items.length === 0) {
return (
<div data-testid='category-quiz-grid-empty'>
<CategoryEmptyState variant='quizzes-in-category' />
</div>
    )
  }

return (
<div data-testid='category-quiz-grid'>
{retryBannerVisible ? (
<div
className='mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive'
role='status'
data-testid='category-quiz-grid-retry-banner'
        >
The server is having trouble. We&apos;ve retried several times — please
          refresh the page in a moment.
        </div>
      ) : null}

<QuizCardGrid
items={items as readonly QuizListItemDto[]}
toQuiz={(item: QuizListItemDto) => item}
      />

{hasMore ? (
<div className='mt-8 flex justify-center'>
<Button
variant='outline'
onClick={loadMore}
disabled={isLoadingMore}
data-testid='category-quiz-grid-load-more'
          >
{isLoadingMore ? 'Loading…' : 'Load more'}
</Button>
</div>
      ) : null}
</div>
  )
}
