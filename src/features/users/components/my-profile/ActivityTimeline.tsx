/**
 * `ActivityTimeline` — renders the activity feed with cursor pagination.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-C1.
 *
 * Renders activity items with load-more functionality.
 * Shows skeleton during loading and empty state when no activity.
 */

import { memo, useCallback } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Inbox } from 'lucide-react';

import { useMyActivity } from '@/features/users/hooks';
import { ActivityItem, ActivityItemSkeleton } from './ActivityItem';

/**
 * Props for ActivityTimeline component.
 */
export interface ActivityTimelineProps {
  /** Initial page size. Defaults to 20. */
  limit?: number;
}

/**
 * Number of skeleton rows to show during loading.
 */
const SKELETON_COUNT = 8;

/**
 * ActivityTimeline skeleton for loading state.
 */
function ActivityTimelineSkeleton() {
  return (
    <div className='space-y-2' aria-busy='true' aria-label='Loading activity'>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Empty state when user has no activity.
 */
function ActivityEmptyState() {
  return (
    <div
      className='flex flex-col items-center justify-center py-12 text-center'
      role='status'
    >
      <Inbox className='w-12 h-12 text-muted-foreground mb-4' aria-hidden='true' />
      <p className='text-sm text-muted-foreground max-w-xs'>
        No activity yet — start playing, authoring, or following to populate this feed.
      </p>
    </div>
  );
}

/**
 * Timeline container that renders activity items with load-more functionality.
 */
export const ActivityTimeline = memo(function ActivityTimeline({
  limit = 20,
}: ActivityTimelineProps) {
  const { items, isLoading, hasMore, loadMore, error } = useMyActivity({ limit });

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base flex items-center gap-2'>
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimelineSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base flex items-center gap-2'>
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <p className='text-sm text-destructive'>
              Failed to load activity. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base flex items-center gap-2'>
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityEmptyState />
        </CardContent>
      </Card>
    );
  }

  // Content with items
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base flex items-center gap-2'>
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Activity list */}
        <div
          className='space-y-2'
          role='list'
          aria-label='Activity timeline'
        >
          {items.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className='flex justify-center pt-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleLoadMore}
              aria-label='Load more activity'
            >
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
