

import { memo } from 'react';

import { Trophy, Zap, Medal, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

import { useMyRanking } from '@/features/users/hooks';

export interface RankingPanelProps {

className?: string;

refreshInterval?: number;
}

function RankingPanelSkeleton() {
return (
<Card className='p-6'>
<div className='flex items-center gap-4'>
<Skeleton className='w-20 h-20 rounded-full' />
<div className='flex-1 space-y-3'>
<Skeleton className='h-8 w-32' />
<Skeleton className='h-4 w-24' />
<Skeleton className='h-4 w-40' />
</div>
</div>
</Card>
  );
}

function RankingEmptyState() {
return (
<Card className='p-6'>
<div className='flex flex-col items-center justify-center py-8 text-center'>
<Trophy className='w-12 h-12 text-muted-foreground mb-4' aria-hidden='true' />
<p className='text-sm text-muted-foreground max-w-xs'>
Your rank appears here after your first XP event.
        </p>
</div>
</Card>
  );
}

function formatXP(xp: number): string {
return xp.toLocaleString();
}

function getRankTier(rank: number): { label: string; color: string } {
if (rank === 1) return { label: 'Gold', color: 'text-yellow-500' };
if (rank === 2) return { label: 'Silver', color: 'text-gray-400' };
if (rank === 3) return { label: 'Bronze', color: 'text-amber-700' };
if (rank <= 10) return { label: 'Top 10', color: 'text-purple-500' };
if (rank <= 100) return { label: 'Top 100', color: 'text-blue-500' };
return { label: 'Ranked', color: 'text-muted-foreground' };
}

export const RankingPanel = memo(function RankingPanel({
className,
refreshInterval,
}: RankingPanelProps) {
const { ranking, isLoading, error } = useMyRanking(refreshInterval);

if (isLoading) {
return <RankingPanelSkeleton />;
  }

if (error) {
return (
<Card className='p-6'>
<div className='text-center py-4'>
<p className='text-sm text-destructive'>
Failed to load ranking. Please try again.
          </p>
</div>
</Card>
    );
  }

if (!ranking || ranking.globalRank === null || ranking.globalRank === undefined) {
return <RankingEmptyState />;
  }

const rankTier = getRankTier(ranking.globalRank);

return (
<Card className={className}>
<CardContent className='p-6'>
<div className='flex items-center gap-4'>
{/* Rank badge */}
<div className='relative'>
<div className='w-20 h-20 rounded-full bg-linear-to-br from-brand/20 to-brand/5 flex items-center justify-center border-4 border-brand/30'>
<Trophy className='w-10 h-10 text-brand' aria-hidden='true' />
</div>
{ranking.globalRank && ranking.globalRank <= 3 && (
<div
className='absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white'
style={{
backgroundColor:
ranking.globalRank === 1
? '#FFD700'
: ranking.globalRank === 2
? '#C0C0C0'
: '#CD7F32',
                }}
aria-label={`Rank ${ranking.globalRank}`}
              >
{ranking.globalRank}
</div>
            )}
</div>

{/* Stats */}
<div className='flex-1'>
{/* Rank number */}
<div className='flex items-baseline gap-2'>
<span className={`text-4xl font-bold ${rankTier.color}`}>
#{ranking.globalRank}
</span>
<span className={`text-sm font-medium ${rankTier.color}`}>
{rankTier.label}
</span>
</div>

{/* XP */}
<div className='flex items-center gap-2 mt-1'>
<Zap className='w-4 h-4 text-amber-500' aria-hidden='true' />
<span className='text-sm text-muted-foreground'>
{formatXP(ranking.totalScore)} XP
              </span>
</div>

{/* Level */}
<div className='flex items-center gap-2 mt-1'>
<Medal className='w-4 h-4 text-purple-500' aria-hidden='true' />
<span className='text-sm text-muted-foreground'>
Level {ranking.level}
</span>
</div>

{/* Last updated */}
{ranking.updatedAt && (
<div className='flex items-center gap-2 mt-2'>
<TrendingUp className='w-3 h-3 text-muted-foreground' aria-hidden='true' />
<span className='text-xs text-muted-foreground'>
Updated {new Date(ranking.updatedAt).toLocaleDateString()}
</span>
</div>
            )}
</div>
</div>
</CardContent>
</Card>
  );
});
