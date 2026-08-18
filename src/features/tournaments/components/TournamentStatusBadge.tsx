"use client";

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import type { TournamentStatus } from "@/features/tournaments/types";

export interface TournamentStatusBadgeProps {

status: TournamentStatus | undefined;
className?: string;
}

const STATUS_CONFIG: Record<
TournamentStatus,
{ label: string; variant: string }
> = {
upcoming: {
label: "Upcoming",
variant: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  },
registration: {
label: "Registration Open",
variant: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  },
ongoing: {
label: "Active",
variant: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-200 dark:border-green-800",
  },
finished: {
label: "Finished",
variant: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200 border-gray-200 dark:border-gray-800",
  },
cancelled: {
label: "Cancelled",
variant: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800",
  },
};

export function TournamentStatusBadge({
status,
className,
}: TournamentStatusBadgeProps) {
if (status === undefined) {
return null;
  }

const config = STATUS_CONFIG[status];

return (
<Badge
variant="outline"
className={cn("font-medium", config.variant, className)}
aria-label={"Status: " + config.label}
    >
{config.label}
</Badge>
  );
}
