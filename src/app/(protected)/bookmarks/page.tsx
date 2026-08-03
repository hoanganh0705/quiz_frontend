'use client'

/**
 * Bookmarks page — `/bookmarks`
 *
 * Renders the `BookmarksDashboardPage` component which handles:
 * - Collection grid with CRUD operations
 * - Create/rename/delete dialogs
 * - Loading and empty states
 */

import { BookmarksDashboardPage } from '@/features/bookmarks'

export default function BookmarksPage() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Page Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-foreground mb-2'>Saved Quizzes</h1>
        <p className='text-foreground/70 text-base'>
          Manage your bookmarked quizzes and collections
        </p>
      </div>

      {/* Collections Dashboard */}
      <BookmarksDashboardPage />
    </div>
  )
}
