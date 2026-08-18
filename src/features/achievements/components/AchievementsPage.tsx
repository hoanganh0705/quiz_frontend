"use client";

import { Suspense } from "react";

import { AchievementsPlaceholder } from "@/features/rankings/components/shared/Placeholder";
import { isAchievementSurfaceEnabled } from "@/features/achievements/flags";
import { BadgeGallery } from "@/features/achievements/components/BadgeGallery";
import { EarnedBadgeList } from "@/features/achievements/components/EarnedBadgeList";
import { AchievementHistory } from "@/features/achievements/components/AchievementHistory";
import { useAchievementNotificationRevalidation } from "@/features/achievements/hooks/useAchievementNotificationRevalidation";
import { useAchievementFocusRevalidation } from "@/features/achievements/hooks/useAchievementFocusRevalidation";

interface AchievementsPageProps {
className?: string;
}

export function AchievementsPage({ className }: AchievementsPageProps) {
const isLive = isAchievementSurfaceEnabled();

if (!isLive) {
return (
<main
data-testid="achievements-page-placeholder"
className={`mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
      >
<AchievementsPlaceholder />
</main>
    );
  }

return <AchievementsPageLive className={className} />;
}

function AchievementsPageLive({ className }: AchievementsPageProps) {

useAchievementNotificationRevalidation();

useAchievementFocusRevalidation();

return (
<main
data-testid="achievements-page"
className={`mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
    >
<header className="space-y-1">
<h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
<p className="text-sm text-muted-foreground">
Browse the badge catalog, your earned badges, and your full
          achievement history.
        </p>
</header>

{/* `BadgeGallery` uses `useSearchParams`; wrap in Suspense so
          Next.js can prerender the rest of the page when the flag is
          off (the gallery returns `null` in that case anyway). */}
<Suspense fallback={null}>
<BadgeGallery />
</Suspense>
<EarnedBadgeList />
<Suspense fallback={null}>
<AchievementHistory />
</Suspense>
</main>
  );
}
