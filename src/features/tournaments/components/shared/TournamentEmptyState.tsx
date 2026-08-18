"use client";

import { Trophy, Users, BarChart3, Calendar } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import type { LucideIcon } from "lucide-react";

export type TournamentEmptyStateVariant =
| "list"
  | "participants"
  | "leaderboard"
  | "detail";

interface TournamentEmptyStateProps {
variant?: TournamentEmptyStateVariant;
className?: string;
}

const VARIANT_CONFIG: Record<
TournamentEmptyStateVariant,
{ icon: LucideIcon; title: string; description: string }
> = {
list: {
icon: Trophy,
title: "No tournaments found",
description:
"There are no tournaments matching your current filters. Try adjusting your search or check back later for upcoming events.",
  },
participants: {
icon: Users,
title: "No participants yet",
description:
"Be the first to join this tournament! Registration is open, so sign up and compete.",
  },
leaderboard: {
icon: BarChart3,
title: "Leaderboard not available",
description:
"The leaderboard will appear once participants start submitting scores.",
  },
detail: {
icon: Calendar,
title: "Tournament not found",
description:
"This tournament may have been removed or the link might be incorrect.",
  },
};

export function TournamentEmptyState({
variant = "list",
className,
}: TournamentEmptyStateProps) {
const config = VARIANT_CONFIG[variant];

return (
<EmptyState
icon={config.icon}
title={config.title}
description={config.description}
size="md"
className={className}
    />
  );
}
