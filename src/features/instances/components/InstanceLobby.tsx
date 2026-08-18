"use client";

import { useMemo } from "react";

import { cn } from "@/shared/utils/merge-class-names";

import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import type { InstanceStatus } from "@/features/instances/types/instance.types";

import { ConnectionBanner } from "./ConnectionBanner";
import { HostControls } from "./HostControls";
import { InstanceStatusBanner } from "./InstanceStatusBanner";
import { JoinLeaveCta } from "./JoinLeaveCta";
import { PlayerRoster } from "./PlayerRoster";

export interface InstanceLobbyProps {

instanceId: string | null;

currentUserId?: string | null;
className?: string;
}

export function InstanceLobby({
instanceId,
currentUserId = null,
className,
}: InstanceLobbyProps) {

useInstanceSocket(instanceId);

const { instance } = useInstance(instanceId, currentUserId);
const status: InstanceStatus | null = instance?.status ?? null;

const isClosed = useMemo(
() => status === "closed" || status === "finished",
[status],
  );

return (
<div
className={cn("space-y-6", className)}
data-testid="instance-lobby"
role="region"
aria-label="Instance lobby"
    >
<InstanceStatusBanner
instanceId={instanceId}
currentUserId={currentUserId}
      />

<ConnectionBanner instanceId={instanceId} />

<PlayerRoster
instanceId={instanceId}
currentUserId={currentUserId}
      />

{!isClosed && (
<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
<div className="flex-1 min-w-0">
<JoinLeaveCta
instanceId={instanceId}
currentUserId={currentUserId}
            />
</div>
<div className="flex-1 min-w-0">
<HostControls
instanceId={instanceId}
currentUserId={currentUserId}
            />
</div>
</div>
      )}
</div>
  );
}