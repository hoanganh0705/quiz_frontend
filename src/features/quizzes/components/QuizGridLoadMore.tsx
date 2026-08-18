

import { Button } from '@/components/ui/Button'

export interface QuizGridLoadMoreProps {
hasMore: boolean
isLoading: boolean
onLoadMore: () => void
}

export function QuizGridLoadMore({
hasMore,
isLoading,
onLoadMore
}: QuizGridLoadMoreProps): React.ReactElement | null {
if (!hasMore) {
return null
  }

return (
<div
className='mt-6 flex flex-col items-center gap-2'
role='status'
aria-live='polite'
data-testid='quiz-grid-load-more'
    >
<Button
variant='outline'
onClick={onLoadMore}
disabled={isLoading}
aria-disabled={isLoading}
data-testid='quiz-grid-load-more-button'
      >
{isLoading ? 'Loading more quizzes…' : 'Load more quizzes'}
</Button>
</div>
  )
}
