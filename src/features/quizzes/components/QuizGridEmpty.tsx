

import { FolderOpen, SearchX } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export type QuizGridEmptyVariant = 'filters-no-match' | 'directory-empty'

export interface QuizGridEmptyProps {

hasFilters: boolean

onReset: () => void
}

export function QuizGridEmpty({
hasFilters,
onReset
}: QuizGridEmptyProps): React.ReactElement {
const variant: QuizGridEmptyVariant = hasFilters
? 'filters-no-match'
: 'directory-empty'

if (variant === 'filters-no-match') {
return (
<div
data-testid='quiz-grid-empty'
data-variant='filters-no-match'
      >
<EmptyState
icon={SearchX}
title='No quizzes match these filters.'
description='Try removing some filters.'
actions={[
{
label: 'Reset filters',
onClick: onReset,
variant: 'outline'
            }
          ]}
        />
</div>
    )
  }

return (
<div data-testid='quiz-grid-empty' data-variant='directory-empty'>
<EmptyState
icon={FolderOpen}
title='No published quizzes yet.'
description='Check back soon for new content.'
      />
</div>
  )
}

export function QuizGridEmptyResetButton({
onReset
}: {
onReset: () => void
}) {
return (
<Button onClick={onReset} variant='outline'>
Reset filters
    </Button>
  )
}
