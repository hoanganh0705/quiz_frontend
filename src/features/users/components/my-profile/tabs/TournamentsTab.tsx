

import { memo, useCallback } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
Trophy,
Flag,
TrendingUp,
Inbox,
ChevronRight,
} from 'lucide-react';

import {
useMyTournaments,
useMyTournamentHistory,
useMyTournamentAnalytics,
} from '@/features/users/hooks';
import { TournamentSparkline } from '../TournamentSparkline';

const SKELETON_COUNT = 4;

function ActiveTournamentsSkeleton() {
return (
<div className='space-y-2'>
{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
<div key={i} className='flex items-center justify-between p-3 border rounded-lg'>
<Skeleton className='h-5 w-40' />
<Skeleton className='h-5 w-20' />
</div>
      ))}
</div>
  );
}

function TournamentHistorySkeleton() {
return (
<div className='space-y-2'>
{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
<div key={i} className='flex items-center justify-between p-3 border rounded-lg'>
<div className='flex items-center gap-3'>
<Skeleton className='h-8 w-8 rounded-full' />
<Skeleton className='h-5 w-40' />
</div>
<Skeleton className='h-5 w-16' />
</div>
      ))}
</div>
  );
}

function formatTournamentStatus(status: string): string {
switch (status) {
case 'upcoming':
return 'Upcoming';
case 'active':
return 'Active';
case 'completed':
return 'Completed';
default:
return status;
  }
}

function formatDate(isoString: string): string {
const date = new Date(isoString);
return date.toLocaleDateString('en-US', {
month: 'short',
day: 'numeric',
  });
}

export const TournamentsTab = memo(function TournamentsTab() {
const {
tournaments,
isLoading: tournamentsLoading,
error: tournamentsError,
  } = useMyTournaments();

const {
items: historyItems,
isLoading: historyLoading,
hasMore: historyHasMore,
loadMore: loadMoreHistory,
  } = useMyTournamentHistory({ limit: 10 });

const {
analytics,
isLoading: analyticsLoading,
  } = useMyTournamentAnalytics();

const handleLoadMoreHistory = useCallback(() => {
loadMoreHistory();
  }, [loadMoreHistory]);

return (
<div className='mt-6 space-y-6'>
{/* Analytics Sparkline */}
{!analyticsLoading && analytics && (
<TournamentSparkline analytics={analytics} />
      )}

{/* Active Tournaments */}
<Card>
<CardHeader>
<CardTitle className='text-base flex items-center gap-2'>
<Flag className='w-4 h-4' aria-hidden='true' />
Active Tournaments
          </CardTitle>
</CardHeader>
<CardContent>
{tournamentsLoading ? (
<ActiveTournamentsSkeleton />
          ) : tournamentsError ? (
<div className='text-center py-8'>
<p className='text-sm text-destructive'>
Failed to load tournaments. Please try again.
              </p>
</div>
          ) : tournaments.length === 0 ? (
<div className='flex flex-col items-center justify-center py-8 text-center'>
<Trophy className='w-10 h-10 text-muted-foreground mb-3' aria-hidden='true' />
<p className='text-sm text-muted-foreground mb-3'>
You haven't joined a tournament yet.
              </p>
<Button variant='outline' size='sm' asChild>
<Link href='/tournaments'>
Browse Tournaments
                  <ChevronRight className='w-4 h-4 ml-1' aria-hidden='true' />
</Link>
</Button>
</div>
          ) : (
<div className='space-y-2'>
{tournaments.map((tournament) => (
<div
key={tournament.tournamentId}
className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                >
<div className='flex items-center gap-3'>
<div className='p-2 rounded-full bg-blue-500/10'>
<Trophy className='w-4 h-4 text-blue-500' aria-hidden='true' />
</div>
<div>
<p className='text-sm font-medium'>{tournament.name}</p>
<p className='text-xs text-muted-foreground'>
{formatTournamentStatus(tournament.status)}
</p>
</div>
</div>
<div className='text-right'>
<p className='text-xs text-muted-foreground'>
Ends {formatDate(tournament.endAt)}
</p>
</div>
</div>
              ))}
</div>
          )}
</CardContent>
</Card>

{/* Tournament History */}
<Card>
<CardHeader>
<CardTitle className='text-base flex items-center gap-2'>
<TrendingUp className='w-4 h-4' aria-hidden='true' />
Tournament History
          </CardTitle>
</CardHeader>
<CardContent>
{historyLoading && historyItems.length === 0 ? (
<TournamentHistorySkeleton />
          ) : historyItems.length === 0 ? (
<div className='flex flex-col items-center justify-center py-8 text-center'>
<Inbox className='w-10 h-10 text-muted-foreground mb-3' aria-hidden='true' />
<p className='text-sm text-muted-foreground'>
Past tournament history will appear here.
              </p>
</div>
          ) : (
<>
<div className='space-y-2'>
{historyItems.map((item) => (
<div
key={item.tournamentId}
className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                  >
<div className='flex items-center gap-3'>
<div
className={`p-2 rounded-full ${
item.rank === 1
? 'bg-yellow-500/10'
: item.rank && item.rank <= 3
? 'bg-gray-500/10'
: 'bg-muted'
}`}
                      >
<Trophy
className={`w-4 h-4 ${
item.rank === 1
? 'text-yellow-500'
: item.rank && item.rank <= 3
? 'text-gray-500'
: 'text-muted-foreground'
}`}
aria-hidden='true'
                        />
</div>
<div>
<p className='text-sm font-medium'>{item.tournamentName}</p>
<p className='text-xs text-muted-foreground'>
{item.participantCount} participants
                        </p>
</div>
</div>
<div className='text-right'>
{item.rank !== null && item.rank !== undefined ? (
<p className='text-sm font-bold'>#{item.rank}</p>
                      ) : (
<p className='text-sm text-muted-foreground'>-</p>
                      )}
<p className='text-xs text-muted-foreground'>
{item.score.toLocaleString()} pts
                      </p>
</div>
</div>
                ))}
</div>

{/* Load more */}
{historyHasMore && (
<div className='flex justify-center pt-4'>
<Button
variant='outline'
size='sm'
onClick={handleLoadMoreHistory}
                  >
Load More
                  </Button>
</div>
              )}
</>
          )}
</CardContent>
</Card>
</div>
  );
});
