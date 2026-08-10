'use client';

/**
 * `CollectionQuizGrid` — grid component for displaying collection quizzes with selection.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B3-2.
 *
 * ## What this component owns
 *
 *   - Grid layout with quiz cards.
 *   - Multi-select functionality with checkboxes.
 *   - "Select all" option for current page.
 *   - Bulk action bar when items are selected.
 *   - Empty state when no quizzes.
 *   - Loading skeleton for initial load.
 */

import { memo, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Play, Clock, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CollectionQuiz } from '@/features/bookmarks/types';

interface CollectionQuizGridProps {
  /** Array of quizzes in the collection. */
  quizzes: readonly CollectionQuiz[];
  /** Currently selected quiz IDs. */
  selectedQuizIds: Set<string>;
  /** Callback when selection changes. */
  onSelectionChange: (selectedIds: Set<string>) => void;
  /** Whether more pages can be loaded. */
  hasMore?: boolean;
  /** Whether a load is in progress. */
  isLoading?: boolean;
  /** Callback when "Load more" is clicked. */
  onLoadMore?: () => void;
  /** Callback when "Remove selected" is clicked. */
  onRemoveSelected?: () => void;
  /** Label for the remove action. */
  removeLabel?: string;
  /** Callback when "Add quizzes" is clicked from empty state. */
  onAddQuizzes?: () => void;
}

/**
 * Skeleton placeholder for loading state.
 */
function CollectionQuizGridSkeleton() {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className='animate-pulse rounded-lg border bg-card overflow-hidden'>
          <div className='h-40 bg-muted' />
          <div className='p-3 space-y-2'>
            <div className='h-4 w-3/4 rounded bg-muted' />
            <div className='h-3 w-1/2 rounded bg-muted' />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when collection has no quizzes.
 */
function EmptyQuizList({ onAddQuizzes }: { onAddQuizzes?: () => void }) {
  return (
    <div className='flex flex-col items-center justify-center py-16 text-center'>
      <div className='h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4'>
        <Plus className='h-8 w-8 text-muted-foreground' aria-hidden='true' />
      </div>
      <h3 className='text-lg font-medium mb-2'>This collection is empty</h3>
      <p className='text-sm text-muted-foreground mb-4 max-w-sm'>
        Add quizzes to this collection to get started. You can search for quizzes and add them in bulk.
      </p>
      {onAddQuizzes && (
        <Button onClick={onAddQuizzes} className='gap-2'>
          <Plus className='h-4 w-4' aria-hidden='true' />
          Add quizzes
        </Button>
      )}
    </div>
  );
}

/**
 * CollectionQuizGrid component.
 *
 * Features:
 * - Grid layout with quiz cards
 * - Each card shows: quiz title, thumbnail, added date
 * - Multi-select with checkboxes
 * - "Select all" for current page
 * - Bulk action bar when items selected
 * - Empty state
 * - Loading skeleton
 */
const CollectionQuizGrid = memo(function CollectionQuizGrid({
  quizzes,
  selectedQuizIds,
  onSelectionChange,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  onRemoveSelected,
  removeLabel = 'Remove selected',
  onAddQuizzes,
}: CollectionQuizGridProps) {
  // Calculate if all current page items are selected
  const allSelected = useMemo(() => {
    if (quizzes.length === 0) return false;
    return quizzes.every((q) => selectedQuizIds.has(q.quizId));
  }, [quizzes, selectedQuizIds]);

  // Handle individual quiz selection
  const handleQuizToggle = useCallback(
    (quizId: string, checked: boolean) => {
      const newSelected = new Set(selectedQuizIds);
      if (checked) {
        newSelected.add(quizId);
      } else {
        newSelected.delete(quizId);
      }
      onSelectionChange(newSelected);
    },
    [selectedQuizIds, onSelectionChange],
  );

  // Handle "select all" toggle
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allIds = new Set(selectedQuizIds);
        quizzes.forEach((q) => allIds.add(q.quizId));
        onSelectionChange(allIds);
      } else {
        const remaining = new Set(selectedQuizIds);
        quizzes.forEach((q) => remaining.delete(q.quizId));
        onSelectionChange(remaining);
      }
    },
    [quizzes, selectedQuizIds, onSelectionChange],
  );

  // Handle "select all" checkbox state
  const selectAllIndeterminate = useMemo(() => {
    if (quizzes.length === 0) return false;
    const selectedCount = quizzes.filter((q) => selectedQuizIds.has(q.quizId)).length;
    return selectedCount > 0 && selectedCount < quizzes.length;
  }, [quizzes, selectedQuizIds]);

  // Loading state
  if (isLoading) {
    return <CollectionQuizGridSkeleton />;
  }

  // Empty state
  if (quizzes.length === 0) {
    return <EmptyQuizList onAddQuizzes={onAddQuizzes} />;
  }

  const selectedCount = selectedQuizIds.size;

  return (
    <div className='space-y-4'>
      {/* Toolbar */}
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) (el as HTMLInputElement).indeterminate = selectAllIndeterminate;
            }}
            onCheckedChange={handleSelectAll}
            aria-label='Select all quizzes on this page'
          />
          <span className='text-sm text-muted-foreground'>
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select items'}
          </span>
        </div>

        {selectedCount > 0 && onRemoveSelected && (
          <Button
            variant='destructive'
            size='sm'
            onClick={onRemoveSelected}
            className='gap-2'
          >
            <Trash2 className='h-4 w-4' aria-hidden='true' />
            {removeLabel}
          </Button>
        )}
      </div>

      {/* Quiz grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {quizzes.map((quiz) => {
          const isSelected = selectedQuizIds.has(quiz.quizId);

          return (
            <div
              key={quiz.bookmarkId}
              className={`group relative rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background'
                  : 'hover:shadow-md hover:border-border'
              }`}
            >
              {/* Selection checkbox */}
              <div className='absolute top-3 left-3 z-10'>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleQuizToggle(quiz.quizId, Boolean(checked))}
                  aria-label={`Select ${quiz.quizTitle}`}
                  className='bg-background/80 backdrop-blur-sm'
                />
              </div>

              {/* Quiz thumbnail */}
              <Link href={`/quizzes/${quiz.quizSlug}`} className='block'>
                <div className='relative h-40'>
                  <Image
                    src={quiz.quizImageUrl || '/placeholder.webp'}
                    alt={quiz.quizTitle}
                    fill
                    sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                    className='object-cover'
                  />
                  {quiz.quizIsFeatured && (
                    <Badge
                      variant='secondary'
                      className='absolute top-3 right-3 bg-yellow-500 text-yellow-950 text-xs'
                    >
                      Featured
                    </Badge>
                  )}
                </div>
              </Link>

              {/* Card content */}
              <div className='p-3'>
                <Link href={`/quizzes/${quiz.quizSlug}`} className='block'>
                  <h3 className='font-semibold text-sm line-clamp-2 mb-2 hover:text-primary transition-colors'>
                    {quiz.quizTitle}
                  </h3>
                </Link>

                <div className='flex items-center gap-2 text-xs text-muted-foreground mb-2'>
                  <Clock className='h-3 w-3' aria-hidden='true' />
                  <span>
                    Added {formatDistanceToNow(new Date(quiz.addedAt), { addSuffix: true })}
                  </span>
                </div>

                <Button
                  asChild
                  size='sm'
                  className='w-full gap-2'
                >
                  <Link href={`/quizzes/${quiz.quizSlug}`}>
                    <Play className='h-3.5 w-3.5' aria-hidden='true' />
                    Play Quiz
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className='flex justify-center pt-4'>
          <Button variant='outline' onClick={onLoadMore} disabled={isLoading}>
            Load more quizzes
          </Button>
        </div>
      )}
    </div>
  );
});

export default CollectionQuizGrid;
