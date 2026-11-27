"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { ArrowLeft, Lock, Trophy } from "lucide-react";

import { useToast } from "@/lib/forms/useToast";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstanceRealtimeBridge } from "@/features/instances/hooks/useInstanceRealtimeBridge";
import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import {
  selectInstanceRealtimeStatus,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";

import { Button } from "@/components/ui/Button";

import {
  ConnectionBanner,
  InstanceClosedState,
  InstanceErrorState,
  InstanceLobby,
  InstanceLobbySkeleton,
} from "../components";

import type { InstanceLifecycleErrorCode } from "@/features/instances/types/instance.types";

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
  const isParticipant = Boolean(
    currentUserId &&
      instance &&
      (instance.hostUserId === currentUserId ||
        instance.players?.some((p) => p.userId === currentUserId)),
  );
  const isCurrentUserFinished = Boolean(
    currentUserId &&
      instance?.players?.some(
        (p) => p.userId === currentUserId && p.status === "finished",
      ),
  );
  const toast = useToast();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (
      effectiveStatus === "running" &&
      instanceId &&
      isParticipant &&
      !isCurrentUserFinished
    ) {
      router.push(`/instances/${instanceId}/play`);
    }
  }, [
    effectiveStatus,
    instanceId,
    isParticipant,
    isCurrentUserFinished,
    router,
  ]);

  useEffect(() => {
    if (effectiveStatus === "closed" && !redirectedRef.current) {
      redirectedRef.current = true;
      try {
        toast.push({
          title: "Room Closed",
          body: "The host has left the room. You have been redirected to active matches.",
          durationMs: 4000,
        });
      } catch {
        // ignore
      }
      router.push("/instances");
    }
  }, [effectiveStatus, router, toast]);

  const pageErrorCode: InstanceLifecycleErrorCode | null = useMemo(() => {
    if (error === null) return null;
    return error.code as InstanceLifecycleErrorCode;
  }, [error]);

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

  const displayStatus = effectiveStatus ?? instance?.status ?? null;
  if (
    instance !== null &&
    displayStatus !== null &&
    shouldShowClosedStatus(displayStatus)
  ) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state={displayStatus}
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
            status={displayStatus}
            closedAt={instance.closedAt}
          />
          {displayStatus === "finished" ? (
            <div className="flex justify-center">
              <Button
                asChild
                className="h-10 sm:h-9 gap-2 bg-default text-default-foreground hover:bg-default-hover"
                data-testid="view-final-results-link"
              >
                <Link href={`/instances/${instanceId}/play`}>
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  View Final Results
                </Link>
              </Button>
            </div>
          ) : null}
          <ConnectionBanner instanceId={instanceId} />
        </div>
      </div>
    );
  }

  if (
    instance !== null &&
    displayStatus === "running" &&
    !isParticipant
  ) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="in-progress"
      >
        <div className="mx-auto max-w-xl rounded-xl border border-border/80 bg-card p-6 sm:p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border/80 bg-muted/50 text-muted-foreground">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Match Already in Progress
            </h1>
            <p className="text-sm text-muted-foreground">
              {instance.quizTitle || "This battle"} has already started and is
              no longer accepting new players.
            </p>
          </div>
          <div className="pt-2">
            <Button
              asChild
              className="h-10 sm:h-9 gap-2 bg-default text-default-foreground hover:bg-default-hover"
            >
              <Link href="/instances">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Browse Open Lobbies
              </Link>
            </Button>
          </div>
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
