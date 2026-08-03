/**
 * `AchievementsTab` — displays badges and ranking.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-D2.
 *
 * Rewrites AchievementsTab to display BadgeGallery and RankingPanel side by side.
 */

import { memo } from 'react';

import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';

import { BadgeGallery } from '../BadgeGallery';
import { RankingPanel } from '../RankingPanel';

/**
 * Achievements tab with badges gallery and ranking panel.
 *
 * @param refreshInterval - Optional polling interval in ms (e.g., 60000 for 60s)
 */
export const AchievementsTab = memo(function AchievementsTab({
  refreshInterval,
}: {
  /** Optional polling interval in ms (e.g., 60000 for 60s) */
  refreshInterval?: number;
}) {
  return (
    <div className='mt-6 space-y-6'>
      {/* Ranking Section */}
      <RankingPanel refreshInterval={refreshInterval} />

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGallery refreshInterval={refreshInterval} />
        </CardContent>
      </Card>
    </div>
  );
});
