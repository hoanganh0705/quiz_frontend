'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Skeleton } from '@/components/ui/Skeleton';
import {
BarChart3,
ChevronDown,
ChevronUp,
RefreshCw,
Star,
Tag,
FolderOpen,
} from 'lucide-react';
import type { CollectionAnalytics } from '@/features/bookmarks/types';

interface CollectionAnalyticsPanelProps {

analytics: CollectionAnalytics | null;

isLoading?: boolean;

isEmpty?: boolean;

onRefresh?: () => void;

isRefreshing?: boolean;
}

function EmptyAnalyticsState() {
return (
<div className='flex flex-col items-center justify-center py-8 text-center'>
<BarChart3 className='h-10 w-10 text-muted-foreground mb-3' aria-hidden='true' />
<p className='text-sm text-muted-foreground'>
Analytics will populate after activity.
      </p>
</div>
  );
}

function AnalyticsSkeleton() {
return (
<div className='space-y-4'>
<div className='grid grid-cols-2 gap-4'>
<Skeleton className='h-20 rounded-lg' />
<Skeleton className='h-20 rounded-lg' />
</div>
<Skeleton className='h-4 w-32 rounded' />
<Skeleton className='h-24 rounded-lg' />
</div>
  );
}

const CollectionAnalyticsPanel = memo(function CollectionAnalyticsPanel({
analytics,
isLoading = false,
isEmpty = false,
onRefresh,
isRefreshing = false,
}: CollectionAnalyticsPanelProps) {
const [isOpen, setIsOpen] = useState(true);

return (
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
<Card>
<CardHeader className='pb-3'>
<div className='flex items-center justify-between'>
<CardTitle className='text-lg flex items-center gap-2'>
<BarChart3 className='h-5 w-5' aria-hidden='true' />
Analytics
            </CardTitle>
<div className='flex items-center gap-2'>
{onRefresh && (
<Button
variant='ghost'
size='icon'
onClick={onRefresh}
disabled={isRefreshing}
aria-label='Refresh analytics'
                >
<RefreshCw
className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
aria-hidden='true'
                  />
</Button>
              )}
<CollapsibleTrigger asChild>
<Button variant='ghost' size='icon' aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}>
{isOpen ? (
<ChevronUp className='h-4 w-4' aria-hidden='true' />
                  ) : (
<ChevronDown className='h-4 w-4' aria-hidden='true' />
                  )}
</Button>
</CollapsibleTrigger>
</div>
</div>
</CardHeader>

<CollapsibleContent>
<CardContent>
{isLoading ? (
<AnalyticsSkeleton />
            ) : isEmpty || !analytics ? (
<EmptyAnalyticsState />
            ) : (
<div className='space-y-4'>
{/* Summary stats */}
<div className='grid grid-cols-2 gap-4'>
{/* Total quizzes */}
<div className='flex flex-col p-4 rounded-lg bg-muted/50'>
<span className='text-2xl font-bold'>{analytics.totalQuizzes}</span>
<span className='text-sm text-muted-foreground flex items-center gap-1'>
<FolderOpen className='h-3.5 w-3.5' aria-hidden='true' />
{analytics.totalQuizzes === 1 ? 'Quiz' : 'Quizzes'}
</span>
</div>

{/* Average rating */}
<div className='flex flex-col p-4 rounded-lg bg-muted/50'>
<span className='text-2xl font-bold flex items-center gap-1'>
{analytics.averageQuizRating > 0 ? (
<>
{analytics.averageQuizRating.toFixed(1)}
<Star className='h-4 w-4 text-yellow-500 fill-yellow-500' aria-hidden='true' />
</>
                      ) : (
<span className='text-lg text-muted-foreground'>N/A</span>
                      )}
</span>
<span className='text-sm text-muted-foreground'>Average rating</span>
</div>
</div>

{/* Top categories */}
{analytics.uniqueCategories > 0 && (
<div>
<h4 className='text-sm font-medium mb-2 flex items-center gap-1'>
<FolderOpen className='h-3.5 w-3.5' aria-hidden='true' />
Top Categories ({analytics.uniqueCategories})
                    </h4>
<p className='text-sm text-muted-foreground'>
{analytics.uniqueCategories} unique categories represented
                    </p>
</div>
                )}

{/* Top tags */}
{analytics.uniqueTags > 0 && (
<div>
<h4 className='text-sm font-medium mb-2 flex items-center gap-1'>
<Tag className='h-3.5 w-3.5' aria-hidden='true' />
Top Tags ({analytics.uniqueTags})
                    </h4>
<p className='text-sm text-muted-foreground'>
{analytics.uniqueTags} unique tags represented
                    </p>
</div>
                )}

{/* Last updated */}
<p className='text-xs text-muted-foreground pt-2 border-t'>
Last updated:{' '}
{analytics.lastUpdated
? new Date(analytics.lastUpdated).toLocaleString()
: 'Never'}
</p>
</div>
            )}
</CardContent>
</CollapsibleContent>
</Card>
</Collapsible>
  );
});

export default CollectionAnalyticsPanel;
