"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstance } from "@/features/instances/hooks/useInstance";
import {
useInstanceRealtimeBridge,
} from "@/features/instances/hooks/useInstanceRealtimeBridge";
import {
selectInstanceRealtimeLastSequence,
selectInstanceRealtimeStatus,
useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import type { InstanceStatus } from "@/features/instances/types/instance.types";

import { InstanceClosedState } from "./shared";

export interface InstanceStatusBannerProps {

instanceId: string | null;

currentUserId?: string | null;
className?: string;
}

const STATUS_CONFIG: Record<
InstanceStatus,
{ label: string; variant: string }
> = {
open: {
label: "Open",
variant:
"bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  },
countdown: {
label: "Starting soon",
variant:
"bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  },
running: {
label: "In progress",
variant:
"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
  },
closed: {
label: "Closed",
variant:
"bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200 border-slate-200 dark:border-slate-800",
  },
finished: {
label: "Finished",
variant:
"bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200 border-slate-200 dark:border-slate-800",
  },
};

export function InstanceStatusBanner({
instanceId,
currentUserId = null,
className,
}: InstanceStatusBannerProps) {

useInstanceRealtimeBridge(instanceId);

const { instance, isLoading } = useInstance(instanceId, currentUserId);

const restStatus = instance?.status ?? null;

const realtimeStatus = useInstanceRealtimeStore((state) =>
instanceId === null
? null
: selectInstanceRealtimeStatus(state, instanceId),
  );
const realtimeSequence = useInstanceRealtimeStore((state) =>
instanceId === null
? 0
: selectInstanceRealtimeLastSequence(state, instanceId),
  );

const resolved = useMemo<{
status: InstanceStatus | null;
isCancelledHint: boolean;
  }>(() => {
if (realtimeStatus !== null && realtimeSequence > 0) {
return {
status: realtimeStatus,
isCancelledHint: realtimeStatus === "closed",
      };
    }
return { status: restStatus, isCancelledHint: false };
  }, [restStatus, realtimeStatus, realtimeSequence]);

if (instanceId === null) return null;

if (
resolved.status === "closed" ||
resolved.status === "finished"
  ) {
return (
<div
className={cn("space-y-3", className)}
data-testid="instance-status-banner"
role="region"
aria-label="Instance status"
      >
<InstanceClosedState
status={resolved.status}
cancelled={resolved.isCancelledHint}
        />
</div>
    );
  }

if (resolved.status === null) {

return (
<div
className={cn("flex items-center gap-2", className)}
data-testid="instance-status-banner"
data-state="loading"
role="region"
aria-label="Instance status"
      >
{isLoading ? (
<Badge
variant="outline"
className="font-medium bg-muted text-muted-foreground"
aria-label="Status: loading"
          >
Loading…
          </Badge>
        ) : null}
</div>
    );
  }

const config = STATUS_CONFIG[resolved.status];

return (
<div
className={cn(
"flex items-center gap-2 px-1 py-0.5",
className,
      )}
data-testid="instance-status-banner"
data-state={resolved.status}
role="region"
aria-label="Instance status"
    >
<Badge
variant="outline"
className={cn("font-medium", config.variant)}
aria-label={`Status: ${config.label}`}
      >
{config.label}
</Badge>
</div>
  );
}