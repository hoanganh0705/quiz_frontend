

import { Skeleton } from "@/components/ui/Skeleton";
import {
BadgeGallerySkeleton,
EarnedBadgeListSkeleton,
AchievementHistorySkeleton,
} from "@/features/achievements/components";

export default function AchievementsLoading() {
return (
<main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
<header className="space-y-1">
<Skeleton className="h-7 w-44" />
<Skeleton className="h-4 w-80" />
</header>
<BadgeGallerySkeleton />
<EarnedBadgeListSkeleton />
<AchievementHistorySkeleton />
</main>
  );
}