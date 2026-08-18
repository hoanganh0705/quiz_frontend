

import type { ReactElement } from "react";

import type { AnalyticsKind } from "@/features/social/types/analytics";

interface AnalyticsPlaceholderProps {

kind: Exclude<AnalyticsKind, "hub">;

targetUserId?: string | null;
}

const COPY: Record<
Exclude<AnalyticsKind, "hub">,
{ title: string; description: string }
> = {
"my-analytics": {
title: "My analytics",
description:
"See how you've been using the social features. Sign in to view your weekly, monthly, and all-time numbers.",
  },
stats: {
title: "Stats",
description:
"See this user's public social stats. Sign in to view the full chart.",
  },
leaderboard: {
title: "Friend leaderboard",
description:
"See how your friends rank by XP this week. Sign in to view the full leaderboard.",
  },
};

export function AnalyticsPlaceholder({
kind,
}: AnalyticsPlaceholderProps): ReactElement {
const copy = COPY[kind];
return (
<section
data-testid={`analytics-placeholder-${kind}`}
aria-label={`${copy.title} (placeholder)`}
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">{copy.title}</h2>
<p className="text-sm text-muted-foreground">{copy.description}</p>
</section>
  );
}
