/**
 * `OverviewTab` — displays activity timeline below profile header.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-D1.
 *
 * Rewrites the OverviewTab to include live activity timeline below the profile header.
 */

import { memo } from 'react';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';

import { ActivityTimeline } from '../ActivityTimeline';

/**
 * Props for OverviewTab component.
 */
export interface OverviewTabProps {
  /** User level for progress display */
  level?: number;
  /** Current XP for progress calculation */
  currentLevelXP?: number;
  /** XP needed for next level */
  nextLevelXP?: number;
  /** Progress percentage (0-100) */
  levelProgress?: number;
  /** Total XP for display */
  totalXP?: number;
}

/**
 * Formats XP number with locale formatting.
 */
function formatXP(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Overview tab with profile header, level progress, and activity timeline.
 */
export const OverviewTab = memo(function OverviewTab({
  level = 1,
  currentLevelXP = 0,
  nextLevelXP = 100,
  levelProgress = 0,
  totalXP = 0,
}: OverviewTabProps) {
  const xpToNextLevel = Math.max(0, nextLevelXP - currentLevelXP);

  return (
    <div className='space-y-6 mt-6'>
      {/* Level Progress Card */}
      <Card className='p-4'>
        <CardHeader className=''>
          <CardTitle className='text-base flex items-center'>
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Level {level}</span>
              <span className='text-muted-foreground'>
                {formatXP(currentLevelXP)} / {formatXP(nextLevelXP)} XP
              </span>
            </div>
            <Progress
              value={levelProgress}
              className='h-2'
              aria-label={`Level progress: ${levelProgress.toFixed(1)}%`}
            />
            <p className='text-xs text-muted-foreground'>
              {formatXP(xpToNextLevel)} XP to reach Level {level + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <ActivityTimeline />

      {/* Quick Stats */}
      <Card className='p-4'>
        <CardHeader className=''>
          <CardTitle className='text-base flex items-center justify-between'>
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-center'>
            <div>
              <p className='text-2xl font-bold text-foreground'>
                {formatXP(totalXP)}
              </p>
              <p className='text-xs text-muted-foreground'>Total XP</p>
            </div>
            <div>
              <p className='text-2xl font-bold text-foreground'>{level}</p>
              <p className='text-xs text-muted-foreground'>Level</p>
            </div>
            <div>
              <p className='text-2xl font-bold text-foreground'>-</p>
              <p className='text-xs text-muted-foreground'>Badges</p>
            </div>
            <div>
              <p className='text-2xl font-bold text-foreground'>-</p>
              <p className='text-xs text-muted-foreground'>Rank</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
