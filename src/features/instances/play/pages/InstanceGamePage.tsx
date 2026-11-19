"use client";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import {
  useInstanceGameSocket,
  useRealtimeGameplay,
  useReconnectReconciliation,
  useInstanceLifecycle,
  useInstancesPlayFeatureFlag,
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
  const { isPlaceholder } = useInstancesPlayFeatureFlag();
  const { currentUser } = useAuthSession();
  const currentPlayerId = currentUser?.userId ?? null;

  useInstanceGameSocket(instanceId);
  const { bundle, isReconciling } = useRealtimeGameplay(instanceId);
  useReconnectReconciliation(instanceId);
  const { closure, isClosed } = useInstanceLifecycle(instanceId);
  const { isLoading: isInitLoading, error: initError } =
    useInstanceGameInit(instanceId);

  if (isPlaceholder) {
    return (
      <div
        className={className}
        data-testid="instance-game-page"
        data-state="placeholder"
      >
        <PlaceholderMessage instanceId={instanceId} />
      </div>
    );
  }

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
        className={className}
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

function PlaceholderMessage({ instanceId }: { instanceId: string | null }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-64 text-center px-4 py-12 space-y-4"
      data-testid="game-placeholder"
      role="status"
    >
      <GameSkeleton />
      <p className="text-sm text-muted-foreground">
        Gameplay features are currently under development and not yet available.
      </p>
      {instanceId !== null && (
        <p className="text-xs text-muted-foreground">
          You can still view the lobby at{" "}
          <a
            href={`/instances/${instanceId}`}
            className="underline hover:text-primary"
          >
            /instances/{instanceId}
          </a>
          .
        </p>
      )}
    </div>
  );
}
