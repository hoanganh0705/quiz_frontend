'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { useReevaluateUserAchievements } from '../hooks';

export interface ReevaluateResultSummaryProps {

userId: string;
}

export function ReevaluateResultSummary({
userId,
}: ReevaluateResultSummaryProps) {
const { lifecycle, audit } = useReevaluateUserAchievements(userId);

if (lifecycle !== 'completed') {
return null;
  }

const { after } = audit;

if (!after) {
return (
<div
role="status"
data-testid="reevaluate-completed-notice"
className="rounded-md border border-border bg-muted/50 p-3 text-sm"
      >
Re-evaluation complete. Refresh the badge list to see the updated
        badges.
      </div>
    );
  }

const totalAwarded =
((after as unknown) as { totalBadgesAwarded?: number }).totalBadgesAwarded ?? 0;

return (
<Card
data-testid="reevaluate-result-summary"
className="mt-4"
    >
<CardHeader>
<CardTitle className="text-base font-medium">
Re-evaluation result
        </CardTitle>
</CardHeader>
<CardContent>
<p
className="text-sm text-muted-foreground"
data-testid="reevaluate-result-copy"
        >
{totalAwarded > 0
? `${totalAwarded} badge${totalAwarded === 1 ? '' : 's'} awarded or updated.`
: 'No new badges awarded. The user\'s badge state is up to date.'}
</p>
<p className="mt-1 text-xs text-muted-foreground">
The badge list above reflects the latest state. Refresh to see
          updated badges.
        </p>
</CardContent>
</Card>
  );
}
