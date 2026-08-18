

import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
Zap,
Trophy,
BookOpen,
Target,
TrendingUp,
} from 'lucide-react';

import {
useMyAnalytics,
useMyRanking,
} from '@/features/users/hooks';

export interface QuickStatsSidebarProps {

className?: string;
}

function formatXP(xp: number): string {
if (xp >= 1000) {
return `${(xp / 1000).toFixed(1)}k`;
  }
return xp.toLocaleString();
}

function formatRank(rank: number | null | undefined): string {
if (rank === null || rank === undefined) return '-';
return `#${rank}`;
}

function QuickStatsSidebarSkeleton() {
return (
<Card className='sticky top-8'>
<CardContent className='p-4 space-y-4'>
<Skeleton className='h-5 w-20' />
{Array.from({ length: 4 }).map((_, i) => (
<div key={i} className='flex justify-between items-center'>
<Skeleton className='h-4 w-24' />
<Skeleton className='h-4 w-12' />
</div>
        ))}
</CardContent>
</Card>
  );
}

export const QuickStatsSidebar = memo(function QuickStatsSidebar({
className,
}: QuickStatsSidebarProps) {
const { analytics, isLoading: analyticsLoading } = useMyAnalytics();
const { ranking, isLoading: rankingLoading } = useMyRanking();

const isLoading = analyticsLoading || rankingLoading;

if (isLoading) {
return <QuickStatsSidebarSkeleton />;
  }

return (
<Card className={`sticky top-8 ${className ?? ''}`}>
<CardContent className='p-4'>
<h2 className='text-base font-bold text-foreground mb-4'>
Quick Stats
        </h2>

<div className='space-y-4'>
{/* Total XP */}
<div className='flex justify-between items-center'>
<span className='text-sm text-muted-foreground flex items-center gap-2'>
<Zap className='w-4 h-4 text-amber-500' aria-hidden='true' />
Total XP
            </span>
<span className='text-sm font-bold text-foreground'>
{formatXP(analytics?.xpTotal ?? 0)}
</span>
</div>

{/* Global Rank */}
<div className='flex justify-between items-center'>
<span className='text-sm text-muted-foreground flex items-center gap-2'>
<Trophy className='w-4 h-4 text-purple-500' aria-hidden='true' />
Global Rank
            </span>
<span className='text-sm font-bold text-foreground'>
{formatRank(ranking?.globalRank)}
</span>
</div>

{/* Quizzes Completed */}
<div className='flex justify-between items-center'>
<span className='text-sm text-muted-foreground flex items-center gap-2'>
<BookOpen className='w-4 h-4 text-brand' aria-hidden='true' />
Quizzes
            </span>
<span className='text-sm font-bold text-foreground'>
{analytics?.quizzesCompleted ?? 0}
</span>
</div>

{/* Average Score */}
<div className='flex justify-between items-center'>
<span className='text-sm text-muted-foreground flex items-center gap-2'>
<Target className='w-4 h-4 text-green-500' aria-hidden='true' />
Avg Score
            </span>
<span className='text-sm font-bold text-foreground'>
{(analytics?.averageScore ?? 0).toFixed(1)}%
            </span>
</div>

{/* Current Streak */}
{analytics?.currentStreak !== undefined && analytics.currentStreak > 0 && (
<div className='flex justify-between items-center'>
<span className='text-sm text-muted-foreground flex items-center gap-2'>
<TrendingUp className='w-4 h-4 text-amber-500' aria-hidden='true' />
Streak
              </span>
<span className='text-sm font-bold text-foreground'>
{analytics.currentStreak} days
              </span>
</div>
          )}
</div>
</CardContent>
</Card>
  );
});
