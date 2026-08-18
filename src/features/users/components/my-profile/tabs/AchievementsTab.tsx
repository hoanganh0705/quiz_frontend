

import { memo } from 'react';

import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';

import { BadgeGallery } from '../BadgeGallery';
import { RankingPanel } from '../RankingPanel';
import { FlairManagementCard } from './FlairManagementCard';

export const AchievementsTab = memo(function AchievementsTab({
refreshInterval,
}: {

refreshInterval?: number;
}) {
return (
<div className='mt-6 space-y-6'>
{/* Active Flair (Epic 7.12) */}
<FlairManagementCard />

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
