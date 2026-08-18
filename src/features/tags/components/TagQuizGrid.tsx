'use client'

import { QuizCardGrid } from '@/components/primitives'
import { Button } from '@/components/ui/Button'
import { TagEmptyState } from './TagEmptyState'
import { useTagQuizzes } from '@/features/tags/hooks/useTagQuizzes'

export interface TagQuizGridProps {
slug: string
params?: { limit?: number }

skeletonCount?: number
}

type WireQuizItem = NonNullable<
ReturnType<typeof useTagQuizzes>['items'][number]
>

export function TagQuizGrid({
slug,
params,
skeletonCount = 12,
}: TagQuizGridProps): React.ReactElement {
const {
items,
isLoading,
isLoadingMore,
hasMore,
loadMore,
error,
refresh,
retryBannerVisible,
  } = useTagQuizzes(slug, params ?? {})

if (isLoading) {
return (
<div data-testid='tag-quiz-grid-loading'>
<QuizCardGrid skeletonCount={skeletonCount} />
</div>
    )
  }

if (error) {
return (
<div
className='text-center py-12'
role='alert'
data-testid='tag-quiz-grid-error'
      >
<p className='text-destructive text-lg mb-4'>
{error.status && error.status >= 500
? 'Something went wrong on our end. Please try again.'
: 'Could not load quizzes for this tag.'}
</p>
<Button
variant='outline'
onClick={() => void refresh()}
data-testid='tag-quiz-grid-retry'
        >
Retry
        </Button>
</div>
    )
  }

if (items.length === 0) {
return (
<div data-testid='tag-quiz-grid-empty'>
<TagEmptyState variant='quizzes-by-tag' />
</div>
    )
  }

return (
<div data-testid='tag-quiz-grid'>
{retryBannerVisible ? (
<div
className='mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive'
role='status'
data-testid='tag-quiz-grid-retry-banner'
        >
The server is having trouble. We&apos;ve retried several times — please
          refresh the page in a moment.
        </div>
      ) : null}

<QuizCardGrid
items={items as readonly WireQuizItem[]}
toQuiz={(item: WireQuizItem) => item}
      />

{hasMore ? (
<div className='mt-8 flex justify-center'>
<Button
variant='outline'
onClick={loadMore}
disabled={isLoadingMore}
data-testid='tag-quiz-grid-load-more'
          >
{isLoadingMore ? 'Loading…' : 'Load more'}
</Button>
</div>
      ) : null}
</div>
  )
}
