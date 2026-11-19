"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstanceRealtimeBridge } from "@/features/instances/hooks/useInstanceRealtimeBridge";
import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import {
  selectInstanceRealtimeCountdownStartedAt,
  selectInstanceRealtimeStatus,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import type { InstanceStatus } from "@/features/instances/types/instance.types";

import { ConnectionBanner } from "./ConnectionBanner";
import { HostControls } from "./HostControls";
import { InstanceCountdownBanner } from "./InstanceCountdownBanner";
import { InstanceStatusBanner } from "./InstanceStatusBanner";
import { InstanceShareCard } from "./InstanceShareCard";
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
  useInstanceRealtimeBridge(instanceId);

  const { instance } = useInstance(instanceId, currentUserId);

  const realtimeStatus = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimeStatus(state, instanceId),
  );
  const realtimeCountdownStartedAt = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimeCountdownStartedAt(state, instanceId),
  );
  const status: InstanceStatus | null =
    realtimeStatus ?? instance?.status ?? null;

  const countdownStartedAt =
    realtimeCountdownStartedAt ??
    (instance as unknown as { countdownStartedAt?: string | null })
      ?.countdownStartedAt ??
    null;

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

      {status === "countdown" && (
        <InstanceCountdownBanner
          countdownStartedAt={countdownStartedAt}
          durationSeconds={5}
          onComplete={() => {
            if (instanceId) {
              useInstanceRealtimeStore.getState().applyLifecycleEvent({
                type: "instance_started",
                instanceId,
                at: new Date().toISOString(),
                eventSequence: Date.now(),
                status: "running",
              });
            }
          }}
        />
      )}

      <ConnectionBanner instanceId={instanceId} />

      {status === "running" && instanceId && (
        <Button
          asChild
          size="lg"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-base"
        >
          <Link href={`/instances/${instanceId}/play`}>
            <Play className="mr-2 h-5 w-5" />
            Enter Live Match
          </Link>
        </Button>
      )}

      {instanceId && !isClosed && (
        <InstanceShareCard
          instanceId={instanceId}
          quizTitle={instance?.quizTitle ?? null}
        />
      )}

      <PlayerRoster instanceId={instanceId} currentUserId={currentUserId} />

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
