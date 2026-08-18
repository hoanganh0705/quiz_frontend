"use client";

import { cn } from "@/shared/utils/merge-class-names";
import { Users } from "lucide-react";

export interface TournamentCapacityIndicatorProps {

currentParticipants?: number | null;

maxParticipants?: number | null;

className?: string;
}

export function TournamentCapacityIndicator({
currentParticipants,
maxParticipants,
className,
}: TournamentCapacityIndicatorProps) {

if (
currentParticipants === null ||
currentParticipants === undefined
  ) {
return null;
  }

const hasCap =
maxParticipants !== null && maxParticipants !== undefined;
const isFull = hasCap && currentParticipants >= maxParticipants;
const progressPercent = hasCap
? Math.min((currentParticipants / maxParticipants) * 100, 100)
: 0;

return (
<div
className={cn("flex items-center gap-2", className)}
data-testid="tournament-capacity-indicator"
data-current={currentParticipants}
data-max={maxParticipants ?? "unlimited"}
data-full={isFull}
    >
<Users
className={cn(
"h-4 w-4 shrink-0",
isFull
? "text-muted-foreground"
: "text-muted-foreground",
        )}
aria-hidden="true"
      />

{hasCap ? (
<div className="flex flex-col gap-1 min-w-0">
<div className="flex items-center justify-between gap-2 text-xs">
<span className="truncate font-medium text-foreground">
{currentParticipants} / {maxParticipants}
</span>
{isFull && (
<span
className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
data-testid="tournament-capacity-indicator-full-badge"
              >
Full
              </span>
            )}
</div>
<div
className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
role="progressbar"
aria-valuenow={currentParticipants}
aria-valuemin={0}
aria-valuemax={maxParticipants}
aria-label={`${currentParticipants} of ${maxParticipants} participants`}
          >
<div
className={cn(
"h-full rounded-full transition-all",
isFull
? "bg-destructive"
: progressPercent >= 80
? "bg-amber-500"
: "bg-primary",
              )}
style={{ width: `${progressPercent}%` }}
            />
</div>
</div>
      ) : (
<span className="text-sm font-medium text-foreground">
{currentParticipants} participant{currentParticipants !== 1 ? "s" : ""}
</span>
      )}
</div>
  );
}
