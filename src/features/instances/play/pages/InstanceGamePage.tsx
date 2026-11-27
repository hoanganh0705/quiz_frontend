"use client";

import Link from "next/link";

import { ArrowLeft, Lock } from "lucide-react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
  useInstanceGameInit,
  useInstanceGameSocket,
  useInstanceLifecycle,
  useRealtimeGameplay,
  useReconnectReconciliation,
} from "@/features/instances/play/hooks";

import { Button } from "@/components/ui/Button";

import { InstanceClosedSummary } from "../components/InstanceClosedSummary";
import { InstanceGameView } from "../components/InstanceGameView";
import { ReconnectDuringGameNotice } from "../components/ReconnectDuringGameNotice";
import { GameErrorState } from "../components/shared/GameErrorState";
import { GameSkeleton } from "../components/shared/GameSkeleton";

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
  const {
    isLoading: isInitLoading,
    error: initError,
    isNotParticipant,
    restrictedQuizTitle,
  } = useInstanceGameInit(instanceId);

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

  if (isInitializing && !isClosed && !isNotParticipant) {
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

  if (isNotParticipant && !isClosed) {
    return (
      <div
        className={className}
        data-testid="instance-game-page"
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
              {restrictedQuizTitle || "This battle"} has already started and is
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
