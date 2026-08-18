

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

export interface ActivityTimelineProps {

limit?: number;
}

const SKELETON_COUNT = 8;

function ActivityTimelineSkeleton() {
return (
<div className='space-y-2' aria-busy='true' aria-label='Loading activity'>
{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
<ActivityItemSkeleton key={i} />
      ))}
</div>
  );
}

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

export const ActivityTimeline = memo(function ActivityTimeline({
limit = 20,
}: ActivityTimelineProps) {
const { items, isLoading, hasMore, loadMore, error } = useMyActivity({ limit });

const handleLoadMore = useCallback(() => {
loadMore();
  }, [loadMore]);

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
