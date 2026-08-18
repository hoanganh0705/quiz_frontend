'use client';

import { LoadingSpinner } from '@/components/ui/loading-states/LoadingSpinner';

import { useReevaluateUserAchievements } from '../hooks';

export interface ReevaluateRunningIndicatorProps {

userId: string;
}

export function ReevaluateRunningIndicator({
userId,
}: ReevaluateRunningIndicatorProps) {
const { lifecycle } = useReevaluateUserAchievements(userId);

if (lifecycle !== 'running') {
return null;
  }

return (
<div
role="status"
aria-live="polite"
aria-label="Re-evaluation in progress"
data-testid="reevaluate-running-indicator"
className="flex items-center gap-2 text-sm text-muted-foreground"
    >
<LoadingSpinner size="sm" />
<span>Re-evaluation running…</span>
</div>
  );
}
