"use client";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { cn } from "@/shared/utils/merge-class-names";

import {
  useInstanceGameSocket,
  useRealtimeGameplay,
  useReconnectReconciliation,
  useInstanceLifecycle,
  useInstanceGameInit,
} from "@/features/instances/play/hooks";

import { GameSkeleton } from "../components/shared/GameSkeleton";
import { GameErrorState } from "../components/shared/GameErrorState";
import { InstanceGameView } from "../components/InstanceGameView";
import { InstanceClosedSummary } from "../components/InstanceClosedSummary";
import { ReconnectDuringGameNotice } from "../components/ReconnectDuringGameNotice";

export interface InstanceGamePageProps {
  instanceId: string | null;
  className?: string;
}

export function InstanceGamePage({
  instanceId,
  className,
}: InstanceGamePageProps) {
  const { currentUser } = useAuthSession();
  const currentPlayerId = currentUser?.userId ?? null;

  useInstanceGameSocket(instanceId);
  const { bundle, isReconciling } = useRealtimeGameplay(instanceId);
  useReconnectReconciliation(instanceId);
  const { closure, isClosed } = useInstanceLifecycle(instanceId);
  const { isLoading: isInitLoading, error: initError } =
    useInstanceGameInit(instanceId);

  if (instanceId === null) {
    return (
      <div
        className={className}
        data-testid="instance-game-page"
        data-state="no-id"
      >
        <GameErrorState error={null} />
      </div>
    );
  }

  const isInitializing =
    (isInitLoading && bundle === null) || (bundle === null && isReconciling);

  if (isInitializing && !isClosed) {
    return (
      <div
        className={className}
        data-testid="instance-game-page"
        data-state="loading"
      >
        <GameSkeleton />
      </div>
    );
  }

  if (initError && bundle === null && !isClosed) {
    return (
      <div
        className={className}
        data-testid="instance-game-page"
        data-state="error"
      >
        <GameErrorState error={initError} />
      </div>
    );
  }

  if (isClosed && closure !== null) {
    return (
      <div
        className={cn("max-w-4xl mx-auto w-full", className)}
        data-testid="instance-game-page"
        data-state={closure.status}
      >
        {/* Reconnect notice (may still be visible during graceful close) */}
        <ReconnectDuringGameNotice instanceId={instanceId} />

        <InstanceClosedSummary
          instanceId={instanceId}
          currentPlayerId={currentPlayerId}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      data-testid="instance-game-page"
      data-state="live"
    >
      <InstanceGameView instanceId={instanceId} />
    </div>
  );
}
