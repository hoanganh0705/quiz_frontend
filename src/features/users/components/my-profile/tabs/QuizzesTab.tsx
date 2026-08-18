

import { memo, useCallback } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
BookOpen,
Trophy,
CheckCircle,
Clock,
Inbox,
ChevronRight,
} from 'lucide-react';

import { useMyAttempts } from '@/features/attempts';

const SKELETON_COUNT = 8;

function AttemptSkeleton() {
return (
<div className='flex items-center justify-between p-3 border rounded-lg'>
<div className='flex items-center gap-3'>
<Skeleton className='h-10 w-10 rounded-full' />
<div className='space-y-2'>
<Skeleton className='h-4 w-40' />
<Skeleton className='h-3 w-24' />
</div>
</div>
<div className='text-right space-y-2'>
<Skeleton className='h-5 w-12 ml-auto' />
<Skeleton className='h-3 w-16 ml-auto' />
</div>
</div>
  );
}

function formatDate(isoString: string): string {
const date = new Date(isoString);
return date.toLocaleDateString('en-US', {
month: 'short',
day: 'numeric',
year: 'numeric',
  });
}

function getStatusDisplay(status: string): {
icon: React.ComponentType<{ className?: string }>;
color: string;
label: string;
} {
switch (status) {
case 'completed':
return { icon: CheckCircle, color: 'text-green-500', label: 'Completed' };
case 'abandoned':
return { icon: Clock, color: 'text-amber-500', label: 'Abandoned' };
default:
return { icon: Clock, color: 'text-muted-foreground', label: 'In Progress' };
  }
}

export const QuizzesTab = memo(function QuizzesTab() {
const {
items: attempts,
isLoading,
hasMore,
loadMore,
  } = useMyAttempts({ limit: 20 });

const handleLoadMore = useCallback(() => {
loadMore();
  }, [loadMore]);

if (isLoading && attempts.length === 0) {
return (
<div className='mt-6'>
<Card>
<CardHeader>
<CardTitle className='text-base'>Quiz Attempts</CardTitle>
</CardHeader>
<CardContent>
<div className='space-y-2'>
{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
<AttemptSkeleton key={i} />
              ))}
</div>
</CardContent>
</Card>
</div>
    );
  }

if (attempts.length === 0) {
return (
<div className='mt-6'>
<Card>
<CardHeader>
<CardTitle className='text-base'>Quiz Attempts</CardTitle>
</CardHeader>
<CardContent>
<div className='flex flex-col items-center justify-center py-12 text-center'>
<Inbox className='w-12 h-12 text-muted-foreground mb-4' aria-hidden='true' />
<p className='text-sm text-muted-foreground mb-4'>
You haven't started an attempt yet.
              </p>
<Button variant='outline' size='sm' asChild>
<Link href='/quizzes'>
Browse Quizzes
                  <ChevronRight className='w-4 h-4 ml-1' aria-hidden='true' />
</Link>
</Button>
</div>
</CardContent>
</Card>
</div>
    );
  }

return (
<div className='mt-6 space-y-6'>
{/* Stats summary */}
<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
<Card>
<CardContent className='p-4'>
<div className='flex items-center gap-3'>
<div className='p-2 rounded-lg bg-brand/10'>
<BookOpen className='w-5 h-5 text-brand' aria-hidden='true' />
</div>
<div>
<p className='text-xl font-bold'>{attempts.length}</p>
<p className='text-xs text-muted-foreground'>Total Attempts</p>
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className='p-4'>
<div className='flex items-center gap-3'>
<div className='p-2 rounded-lg bg-green-500/10'>
<CheckCircle className='w-5 h-5 text-green-500' aria-hidden='true' />
</div>
<div>
<p className='text-xl font-bold'>
{attempts.filter((a) => a.status === 'completed').length}
</p>
<p className='text-xs text-muted-foreground'>Completed</p>
</div>
</div>
</CardContent>
</Card>
<Card>
<CardContent className='p-4'>
<div className='flex items-center gap-3'>
<div className='p-2 rounded-lg bg-amber-500/10'>
<Trophy className='w-5 h-5 text-amber-500' aria-hidden='true' />
</div>
<div>
<p className='text-xl font-bold'>
{attempts.filter((a) => a.status === 'completed').length > 0
? (
attempts
                          .filter((a) => a.status === 'completed')
                          .reduce((sum, a) => sum + (a.scorePercent ?? 0), 0) /
attempts.filter((a) => a.status === 'completed').length
                      ).toFixed(1)
: '0'}
%
                </p>
<p className='text-xs text-muted-foreground'>Avg Score</p>
</div>
</div>
</CardContent>
</Card>
</div>

{/* Attempts list */}
<Card>
<CardHeader>
<CardTitle className='text-base'>Recent Attempts</CardTitle>
</CardHeader>
<CardContent className='space-y-2'>
{attempts.map((attempt) => {
const statusDisplay = getStatusDisplay(attempt.status);
const StatusIcon = statusDisplay.icon;

return (
<div
key={attempt.attemptId}
className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
              >
<div className='flex items-center gap-3'>
<div className={`p-2 rounded-full ${statusDisplay.color} bg-muted/50`}>
<StatusIcon className={`w-5 h-5 ${statusDisplay.color}`} aria-hidden='true' />
</div>
<div>
<p className='text-sm font-medium'>{attempt.quizTitle}</p>
<div className='flex items-center gap-2 text-xs text-muted-foreground'>
<span>{formatDate(attempt.startedAt)}</span>
<span>•</span>
<span>{attempt.difficulty}</span>
{attempt.xpEarned > 0 && (
<>
<span>•</span>
<span>+{attempt.xpEarned} XP</span>
</>
                      )}
</div>
</div>
</div>
<div className='text-right'>
{attempt.status === 'completed' && attempt.scorePercent !== null ? (
<p className={`text-lg font-bold ${
(attempt.scorePercent ?? 0) >= 80
? 'text-green-500'
: (attempt.scorePercent ?? 0) >= 60
? 'text-amber-500'
: 'text-red-500'
}`}>
{attempt.scorePercent?.toFixed(0)}%
                    </p>
                  ) : (
<p className='text-sm text-muted-foreground'>
{statusDisplay.label}
</p>
                  )}
{attempt.status === 'completed' && (
<p className='text-xs text-muted-foreground'>
{attempt.correctCount ?? 0} correct
                    </p>
                  )}
</div>
</div>
            );
          })}

{/* Load more */}
{hasMore && (
<div className='flex justify-center pt-4'>
<Button variant='outline' size='sm' onClick={handleLoadMore}>
Load More
              </Button>
</div>
          )}
</CardContent>
</Card>
</div>
  );
});
