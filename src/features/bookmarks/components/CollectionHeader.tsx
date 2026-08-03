'use client';

/**
 * `CollectionHeader` — header component for the collection detail page.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B3-1.
 *
 * ## What this component owns
 *
 *   - Displays collection name, description, color indicator, and quiz count.
 *   - Loading skeleton state.
 *   - Responsive layout (stacks on mobile).
 */

import { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { BookmarkCollection } from '@/features/bookmarks/types';
import { getCollectionColor } from '@/features/bookmarks/types';
import { FolderOpen, ChevronLeft, Plus } from 'lucide-react';

interface CollectionHeaderProps {
  /** The collection data to display. */
  collection: BookmarkCollection | null;
  /** Whether the collection is loading. */
  isLoading?: boolean;
  /** Callback when "Add quizzes" button is clicked. */
  onAddQuizzes?: () => void;
}

/**
 * Skeleton placeholder for loading state.
 */
function CollectionHeaderSkeleton() {
  return (
    <div className='animate-pulse'>
      <div className='flex items-center gap-2 mb-2'>
        <div className='h-10 w-10 rounded-lg bg-muted' />
        <div className='h-8 w-48 rounded bg-muted' />
      </div>
      <div className='h-4 w-96 max-w-full rounded bg-muted mb-2' />
      <div className='h-4 w-24 rounded bg-muted' />
    </div>
  );
}

/**
 * Collection header component for the detail page.
 *
 * Features:
 * - Back navigation to /bookmarks
 * - Collection name with color indicator
 * - Description (truncated if long)
 * - Quiz count with proper pluralization
 * - "Add quizzes" action button
 * - Loading skeleton state
 */
const CollectionHeader = memo(function CollectionHeader({
  collection,
  isLoading = false,
  onAddQuizzes,
}: CollectionHeaderProps) {
  if (isLoading || !collection) {
    return (
      <div className='space-y-4'>
        <Link
          href='/bookmarks'
          className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
        >
          <ChevronLeft className='h-4 w-4' aria-hidden='true' />
          Back to collections
        </Link>
        <CollectionHeaderSkeleton />
      </div>
    );
  }

  const displayColor = getCollectionColor(collection);

  return (
    <div className='space-y-4'>
      {/* Back navigation */}
      <Link
        href='/bookmarks'
        className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
      >
        <ChevronLeft className='h-4 w-4' aria-hidden='true' />
        Back to collections
      </Link>

      {/* Header content */}
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
        <div className='flex items-start gap-3'>
          {/* Color indicator */}
          <div
            className='h-12 w-12 rounded-lg flex items-center justify-center shrink-0'
            style={{ backgroundColor: displayColor + '20' }}
          >
            <FolderOpen
              className='h-6 w-6'
              style={{ color: displayColor }}
              aria-hidden='true'
            />
          </div>

          {/* Title and description */}
          <div className='space-y-1 min-w-0'>
            <h1 className='text-2xl font-bold truncate'>{collection.name}</h1>
            {collection.description && (
              <p className='text-sm text-muted-foreground line-clamp-2 max-w-2xl'>
                {collection.description}
              </p>
            )}
            <p className='text-sm text-muted-foreground'>
              {collection.quizCount === 0
                ? 'No quizzes saved yet'
                : `${collection.quizCount} ${collection.quizCount === 1 ? 'quiz' : 'quizzes'}`
              }
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {onAddQuizzes && (
          <div className='flex items-center gap-2 shrink-0'>
            <Button onClick={onAddQuizzes} className='gap-2'>
              <Plus className='h-4 w-4' aria-hidden='true' />
              Add quizzes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

export default CollectionHeader;
