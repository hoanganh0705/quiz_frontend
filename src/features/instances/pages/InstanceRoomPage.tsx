"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstanceRealtimeBridge } from "@/features/instances/hooks/useInstanceRealtimeBridge";
import { useInstancesFeatureFlag } from "@/features/instances/hooks/useInstancesFeatureFlag";
import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import {
  selectInstanceRealtimeStatus,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import type { InstanceLifecycleErrorCode } from "@/features/instances/types/instance.types";

import {
  ConnectionBanner,
  InstanceClosedState,
  InstanceErrorState,
  InstanceLobby,
  InstanceLobbySkeleton,
  InstancePlaceholder,
} from "../components";

export interface InstanceRoomPageProps {
  instanceId: string | null;
  className?: string;
}

const PAGE_ERROR_CODES: ReadonlySet<InstanceLifecycleErrorCode> = new Set([
  "INSTANCE_NOT_FOUND",
  "INSTANCE_AUTH_REQUIRED",
  "INSTANCE_FORBIDDEN",
  "GLOBAL_UNAUTHENTICATED",
  "GLOBAL_FORBIDDEN",
  "GLOBAL_NOT_FOUND",
]);

function shouldShowClosedStatus(
  status: ReturnType<typeof useInstance>["instance"] extends infer T
    ? T extends { status: infer S }
      ? S
      : never
    : never,
): boolean {
  return status === "closed" || status === "finished";
}

export function InstanceRoomPage({
  instanceId,
  className,
}: InstanceRoomPageProps) {
  const router = useRouter();
  const { isPlaceholder } = useInstancesFeatureFlag();
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.userId ?? null;

  useInstanceSocket(instanceId);
  useInstanceRealtimeBridge(instanceId);

  const { instance, isLoading, error, refresh } = useInstance(
    instanceId,
    currentUserId,
  );

  const realtimeStatus = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimeStatus(state, instanceId),
  );
  const effectiveStatus = realtimeStatus ?? instance?.status ?? null;

  useEffect(() => {
    if (effectiveStatus === "running" && instanceId) {
      router.push(`/instances/${instanceId}/play`);
    }
  }, [effectiveStatus, instanceId, router]);

  const pageErrorCode: InstanceLifecycleErrorCode | null = useMemo(() => {
    if (error === null) return null;
    return error.code as InstanceLifecycleErrorCode;
  }, [error]);

  if (isPlaceholder) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="placeholder"
      >
        <InstancePlaceholder />
      </div>
    );
  }

  if (instanceId === null) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="no-id"
      >
        <InstanceErrorState error={null} />
      </div>
    );
  }

  if (isLoading && instance === null) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="loading"
      >
        <InstanceLobbySkeleton />
      </div>
    );
  }

  if (
    pageErrorCode !== null &&
    PAGE_ERROR_CODES.has(pageErrorCode) &&
    instance === null
  ) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="error"
      >
        <InstanceErrorState
          error={error}
          onRetry={() => {
            void refresh();
          }}
        />
      </div>
    );
  }

  if (instance !== null && shouldShowClosedStatus(instance.status)) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state={instance.status}
      >
        <div className="space-y-6">
          {instance.quizTitle && (
            <div className="flex flex-col gap-1 border-b border-border/40 pb-4">
              <h1 className="text-2xl font-bold tracking-tight">
                {instance.quizTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                Hosted by {instance.hostDisplayName || instance.hostUsername}
              </p>
            </div>
          )}
          <InstanceClosedState
            status={instance.status}
            closedAt={instance.closedAt}
          />
          <ConnectionBanner instanceId={instanceId} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      data-testid="instance-room-page"
      data-state="live"
    >
      <InstanceLobby instanceId={instanceId} currentUserId={currentUserId} />
    </div>
  );
}
