'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export interface RankingCooldownNoticeProps {

cooldownRemaining: number | null;
}

function formatCountdown(seconds: number): string {
if (seconds < 60) {
return `${seconds}s`;
  }
const minutes = Math.floor(seconds / 60);
const remainingSeconds = seconds % 60;
if (remainingSeconds === 0) {
return `${minutes}m`;
  }
return `${minutes}m ${remainingSeconds}s`;
}

export function RankingCooldownNotice({ cooldownRemaining }: RankingCooldownNoticeProps) {

const [tickCount, setTickCount] = useState(0);

useEffect(() => {
if (cooldownRemaining === null) return;

const interval = setInterval(() => {
setTickCount((prev) => prev + 1);
    }, 1000);

return () => clearInterval(interval);
  }, [cooldownRemaining]);

useEffect(() => {

setTickCount(0);
  }, [cooldownRemaining]);

if (cooldownRemaining === null) {
return null;
  }

const displaySeconds = Math.max(0, cooldownRemaining - tickCount);

return (
<div
data-testid="ranking-cooldown-notice"
role="alert"
className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
    >
<Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
<span>
Cooldown active. You can retry in{' '}
<span data-testid="ranking-cooldown-countdown" className="font-mono font-semibold">
{formatCountdown(displaySeconds)}
</span>
.
      </span>
</div>
  );
}
