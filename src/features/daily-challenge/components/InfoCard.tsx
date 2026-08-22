'use client';

/**
 * `InfoCard` — the four up-top status cards for the live daily-challenge.
 *
 * Rendered only inside the live branch of `DailyChallengePage` (so it does
 * not run in placeholder, skeleton, error, or empty branches). Its data is
 * passed in as props from the page so the today/streak hooks are not
 * subscribed twice on the page route.
 *
 * The countdown ticks once per second under default motion preferences and
 * once per minute when `prefers-reduced-motion: reduce` is set, and the
 * `aria-live` announcement is suppressed under reduced motion.
 */

import * as React from 'react';
import { Clock, Calendar, Trophy, Flame } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';

import { usePrefersReducedMotion } from '@/shared/hooks/use-prefers-reduced-motion';
import { cn } from '@/shared/utils/merge-class-names';

export interface InfoCardProps {
/** When `null`, the page is loading the day's challenge and the reward copy is suppressed. */
rewardXp: number | null;
/** When `null`, the page is loading the day's challenge and the theme copy is suppressed. */
category: string | null;
/** Streak count. `null` means the viewer is not authenticated. */
streak: number | null;
isAuthenticated: boolean;
className?: string;
}

const TICK_INTERVAL_MS = 1_000;
const TICK_INTERVAL_REDUCED_MS = 60_000;

interface RemainingTime {
hours: number;
minutes: number;
seconds: number;
}

function computeRemaining(now: Date): RemainingTime {
const endOfDay = new Date(
now.getFullYear(),
now.getMonth(),
now.getDate(),
23,
59,
59,
999,
);
const diff = Math.max(endOfDay.getTime() - now.getTime(), 0);
return {
hours: Math.floor(diff / (1000 * 60 * 60)),
minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
seconds: Math.floor((diff % (1000 * 60)) / 1000),
};
}

function pad(value: number): string {
return value.toString().padStart(2, '0');
}

function formatTime(remaining: RemainingTime): string {
return `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`;
}

const InfoCard = React.memo(function InfoCard({
rewardXp,
category,
streak,
isAuthenticated,
className,
}: InfoCardProps) {
const prefersReducedMotion = usePrefersReducedMotion();
const [timeRemaining, setTimeRemaining] = React.useState<string>(() => {
return formatTime(computeRemaining(new Date()));
});

React.useEffect(() => {
const update = () => {
setTimeRemaining(formatTime(computeRemaining(new Date())));
};
update();
const intervalMs = prefersReducedMotion
? TICK_INTERVAL_REDUCED_MS
: TICK_INTERVAL_MS;
const interval = window.setInterval(update, intervalMs);
return () => window.clearInterval(interval);
}, [prefersReducedMotion]);

const prizeLabel = rewardXp === null ? '—' : `+${rewardXp} XP`;
const themeLabel = category ?? '—';
const streakLabel =
!isAuthenticated || streak === null
? 'Login to track'
: `${streak} ${streak === 1 ? 'Day' : 'Days'}`;

const timeAriaLive = prefersReducedMotion ? 'off' : 'polite';

return (
<section
className={cn(
'grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6 pb-10',
className,
)}
aria-label='Challenge information'
>
<Card className='bg-card border-border py-6'>
<CardContent className='p-4 flex items-center space-x-3'>
<div
className='p-2 bg-muted rounded-full text-muted-foreground'
aria-hidden='true'
>
<Clock className='h-5 w-5' />
</div>
<div>
<p className='text-sm text-muted-foreground font-medium'>
Time Remaining
</p>
<p
className='text-xl font-bold text-foreground'
aria-live={timeAriaLive}
>
{timeRemaining}
</p>
</div>
</CardContent>
</Card>

<Card className='bg-card border-border py-6'>
<CardContent className='p-4 flex items-center space-x-3'>
<div
className='p-2 bg-muted rounded-full text-muted-foreground'
aria-hidden='true'
>
<Calendar className='h-5 w-5' />
</div>
<div>
<p className='text-sm text-muted-foreground font-medium'>
Today&apos;s Theme
</p>
<p className='text-lg font-bold text-foreground'>{themeLabel}</p>
</div>
</CardContent>
</Card>

<Card className='bg-card border-border py-6'>
<CardContent className='p-4 flex items-center space-x-3'>
<div
className='p-2 bg-muted rounded-full text-muted-foreground'
aria-hidden='true'
>
<Trophy className='h-5 w-5' />
</div>
<div>
<p className='text-sm text-muted-foreground font-medium'>
Top Prize
</p>
<p className='text-xl font-bold text-foreground'>{prizeLabel}</p>
</div>
</CardContent>
</Card>

<Card className='bg-card border-border py-6'>
<CardContent className='p-4 flex items-center space-x-3'>
<div
className='p-2 bg-muted rounded-full text-muted-foreground'
aria-hidden='true'
>
<Flame
className='h-5 w-5 text-orange-400 dark:text-orange-300'
aria-hidden='true'
/>
</div>
<div>
<p className='text-sm text-muted-foreground font-medium'>
Your Streak
</p>
<p className='text-xl font-bold text-foreground'>{streakLabel}</p>
</div>
</CardContent>
</Card>
</section>
);
});

export default InfoCard;