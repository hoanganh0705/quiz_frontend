

import { memo } from 'react';

import { Award, Trophy, Star, Zap, Flame, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

import { useMyBadges } from '@/features/users/hooks';

function getBadgeIcon(rarity: string): React.ComponentType<{ className?: string }> {
switch (rarity.toLowerCase()) {
case 'legendary':
return Star;
case 'epic':
return Trophy;
case 'rare':
return Award;
case 'uncommon':
return Zap;
case 'common':
return Shield;
default:
return Award;
  }
}

function getBadgeColors(rarity: string): { bg: string; text: string; border: string } {
switch (rarity.toLowerCase()) {
case 'legendary':
return {
bg: 'bg-yellow-500/20',
text: 'text-yellow-500',
border: 'border-yellow-500/30',
      };
case 'epic':
return {
bg: 'bg-purple-500/20',
text: 'text-purple-500',
border: 'border-purple-500/30',
      };
case 'rare':
return {
bg: 'bg-blue-500/20',
text: 'text-blue-500',
border: 'border-blue-500/30',
      };
case 'uncommon':
return {
bg: 'bg-green-500/20',
text: 'text-green-500',
border: 'border-green-500/30',
      };
case 'common':
default:
return {
bg: 'bg-gray-500/20',
text: 'text-gray-500',
border: 'border-gray-500/30',
      };
  }
}

function formatEarnedDate(isoString: string): string {
const date = new Date(isoString);
return date.toLocaleDateString('en-US', {
month: 'short',
day: 'numeric',
year: 'numeric',
  });
}

const SKELETON_COUNT = 12;

function BadgeSkeletonItem() {
return (
<div className='flex flex-col items-center gap-2 p-4 rounded-lg border bg-card'>
<Skeleton className='w-12 h-12 rounded-full' />
<Skeleton className='h-4 w-20' />
<Skeleton className='h-3 w-16' />
</div>
  );
}

function BadgeGallerySkeleton() {
return (
<div
className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
aria-busy='true'
aria-label='Loading badges'
    >
{Array.from({ length: SKELETON_COUNT }).map((_, i) => (
<BadgeSkeletonItem key={i} />
      ))}
</div>
  );
}

function BadgeEmptyState() {
return (
<div
className='flex flex-col items-center justify-center py-12 text-center'
role='status'
    >
<Award className='w-12 h-12 text-muted-foreground mb-4' aria-hidden='true' />
<p className='text-sm text-muted-foreground max-w-xs'>
No badges earned yet.
      </p>
</div>
  );
}

export const BadgeGallery = memo(function BadgeGallery({
refreshInterval,
}: {

refreshInterval?: number;
}) {
const { badges, isLoading, error } = useMyBadges(refreshInterval);

if (isLoading) {
return <BadgeGallerySkeleton />;
  }

if (error) {
return (
<div className='text-center py-8'>
<p className='text-sm text-destructive'>
Failed to load badges. Please try again.
        </p>
</div>
    );
  }

if (badges.items.length === 0) {
return <BadgeEmptyState />;
  }

return (
<div
className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
role='list'
aria-label={`${badges.total} badges earned`}
    >
{badges.items.map((badge) => {
const Icon = getBadgeIcon(badge.rarity);
const colors = getBadgeColors(badge.rarity);
const earnedDate = formatEarnedDate(badge.earnedAt);

return (
<div
key={badge.id}
className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${colors.border} bg-card hover:bg-muted/50 transition-colors ${colors.bg}`}
role='listitem'
title={`${badge.name} - Earned ${earnedDate}`}
          >
{/* Badge icon */}
<div className={`p-3 rounded-full ${colors.bg}`}>
<Icon className={`w-8 h-8 ${colors.text}`} aria-hidden='true' />
</div>

{/* Badge name */}
<span className={`text-sm font-medium text-center ${colors.text}`}>
{badge.name}
</span>

{/* Badge description */}
{badge.description && (
<span className='text-xs text-muted-foreground text-center line-clamp-2'>
{badge.description}
</span>
            )}

{/* Earned date */}
<span className='text-xs text-muted-foreground'>
Earned {earnedDate}
</span>

{/* Rarity badge */}
<span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
{badge.rarity}
</span>
</div>
        );
      })}
</div>
  );
});
