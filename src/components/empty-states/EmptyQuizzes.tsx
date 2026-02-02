'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface EmptyQuizzesProps {
  type: 'no-quizzes' | 'no-results' | 'no-category'
  searchQuery?: string
  categoryName?: string
  onClearFilters?: () => void
}

export function EmptyQuizzes({
  type,
  searchQuery,
  categoryName,
  onClearFilters
}: EmptyQuizzesProps) {
  if (type === 'no-quizzes') {
    return (
      <EmptyState
        icon={Search}
        title='No quizzes available'
        description='There are no quizzes available at the moment. Check back later or create your own quiz to get started!'
        size='lg'
        actions={[
          {
            label: 'Create a Quiz',
            href: '/create-quiz'
          },
          {
            label: 'Browse Categories',
            href: '/categories',
            variant: 'outline'
          }
        ]}
      />
    )
  }

  if (type === 'no-results') {
    return (
      <EmptyState
        icon={Search}
        title='No quizzes found'
        description={
          searchQuery
            ? `We couldn't find any quizzes matching "${searchQuery}". Try a different search term or browse categories.`
            : "We couldn't find any quizzes matching your criteria. Try adjusting your filters."
        }
        size='md'
        actions={[
          ...(onClearFilters
            ? [
                {
                  label: 'Clear Filters',
                  onClick: onClearFilters,
                  icon: SlidersHorizontal,
                  variant: 'outline' as const
                }
              ]
            : []),
          {
            label: 'Browse All Quizzes',
            href: '/quizzes'
          }
        ]}
      />
    )
  }

  if (type === 'no-category') {
    return (
      <EmptyState
        icon={Search}
        title={`No quizzes in ${categoryName || 'this category'}`}
        description={`There are no quizzes in ${categoryName || 'this category'} yet. Be the first to create one!`}
        size='md'
        actions={[
          {
            label: 'Create a Quiz',
            href: '/create-quiz'
          },
          {
            label: 'Explore Other Categories',
            href: '/categories',
            variant: 'outline'
          }
        ]}
      />
    )
  }

  return null
}
