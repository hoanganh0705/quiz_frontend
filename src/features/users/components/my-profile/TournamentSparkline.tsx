

import { memo } from 'react';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

import type { MyTournamentAnalyticsResponseDto } from '@/lib/api/generated/schemas';

export interface TournamentSparklineProps {

analytics: MyTournamentAnalyticsResponseDto;

className?: string;
}

function isSparklineEmpty(analytics: MyTournamentAnalyticsResponseDto): boolean {
return (
analytics.tournamentsPlayed === 0 &&
analytics.wins === 0 &&
analytics.averageRank === null &&
analytics.averageRank === undefined
  );
}

function formatAverageRank(rank: number | null | undefined): string {
if (rank === null || rank === undefined) return '-';
return `#${Math.round(rank)}`;
}

function TournamentSparklineSkeleton() {
return (
<Card>
<CardHeader className='pb-2'>
<CardTitle className='text-sm'>Tournament Stats</CardTitle>
</CardHeader>
<CardContent>
<div className='grid grid-cols-3 gap-4'>
<div className='space-y-1'>
<Skeleton className='h-8 w-12' />
<Skeleton className='h-3 w-16' />
</div>
<div className='space-y-1'>
<Skeleton className='h-8 w-12' />
<Skeleton className='h-3 w-16' />
</div>
<div className='space-y-1'>
<Skeleton className='h-8 w-12' />
<Skeleton className='h-3 w-16' />
</div>
</div>
</CardContent>
</Card>
  );
}

export const TournamentSparkline = memo(function TournamentSparkline({
analytics,
className,
}: TournamentSparklineProps) {

if (isSparklineEmpty(analytics)) {
return null;
  }

const winRate =
analytics.tournamentsPlayed > 0
? ((analytics.wins / analytics.tournamentsPlayed) * 100).toFixed(1)
: '0.0';

return (
<Card className={className}>
<CardHeader className='pb-2'>
<CardTitle className='text-sm'>Tournament Stats</CardTitle>
</CardHeader>
<CardContent>
<div className='grid grid-cols-3 gap-4'>
{/* Tournaments Played */}
<div className='flex flex-col items-center text-center'>
<div className='p-2 rounded-lg bg-blue-500/10 mb-2'>
<Trophy className='w-5 h-5 text-blue-500' aria-hidden='true' />
</div>
<p className='text-2xl font-bold'>{analytics.tournamentsPlayed}</p>
<p className='text-xs text-muted-foreground'>Played</p>
</div>

{/* Win Rate */}
<div className='flex flex-col items-center text-center'>
<div className='p-2 rounded-lg bg-amber-500/10 mb-2'>
<TrendingUp className='w-5 h-5 text-amber-500' aria-hidden='true' />
</div>
<p className='text-2xl font-bold'>{winRate}%</p>
<p className='text-xs text-muted-foreground'>Win Rate</p>
</div>

{/* Average Rank */}
<div className='flex flex-col items-center text-center'>
<div className='p-2 rounded-lg bg-purple-500/10 mb-2'>
<Target className='w-5 h-5 text-purple-500' aria-hidden='true' />
</div>
<p className='text-2xl font-bold'>
{formatAverageRank(analytics.averageRank)}
</p>
<p className='text-xs text-muted-foreground'>Avg Rank</p>
</div>
</div>
</CardContent>
</Card>
  );
});
