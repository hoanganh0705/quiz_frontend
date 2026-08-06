"use client";

/**
 * `InstanceGameView` — master game view composing the full play layout.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.E5.
 *
 * Composes `QuestionCard`, `AnswerOptions`, `QuestionTimer`,
 * `AnswerSubmissionState`, `PlayerProgressPanel`, `LiveLeaderboard`,
 * `GameConnectionStatus`, `GameStaleState`, `ReconnectDuringGameNotice`,
 * `InstanceClosedSummary`, and `GameResult` into a deterministic layout.
 *
 * Renders `InstanceClosedSummary` exclusively when `closure.status` is
 * `'closed'` or `'cancelled'`; the play components are hidden in that state.
 * Renders `ReconnectDuringGameNotice` while `isReconciling === true`.
 *
 * The view never drives reveal, scoring, or closure from local state.
 * When the feature flag is `'placeholder'`, renders the safe placeholder.
 */

import { useAuth } from "@/features/auth/hooks/use-auth";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
  useInstanceLifecycle,
  useReconnectReconciliation,
} from "@/features/instances/play/hooks";

import { GameConnectionStatus } from "./shared/GameConnectionStatus";
import { GameSkeleton } from "./shared/GameSkeleton";
import { GameEmptyState } from "./shared/GameEmptyState";

import { QuestionCard } from "./QuestionCard";
import { AnswerOptions } from "./AnswerOptions";
import { QuestionTimer } from "./QuestionTimer";
import { GameAnswerSubmissionState } from "./AnswerSubmissionState";
import { PlayerProgressPanel } from "./PlayerProgressPanel";
import { LiveLeaderboard } from "./LiveLeaderboard";
import { GameResult } from "./GameResult";
import { InstanceClosedSummary } from "./InstanceClosedSummary";
import { ReconnectDuringGameNotice } from "./ReconnectDuringGameNotice";

interface InstanceGameViewProps {
  instanceId: string;
  className?: string;
}

function PlaceholderView({ className }: { className?: string }) {
  return (
    <div
      className={className}
      data-testid="game-placeholder"
      role="status"
    >
      <GameEmptyState />
      <p className="text-xs text-muted-foreground text-center mt-4">
        Gameplay features are currently under development.
      </p>
    </div>
  );
}

export function InstanceGameView({ instanceId, className }: InstanceGameViewProps) {
  const { currentUser } = useAuth();
  const currentPlayerId = currentUser?.userId ?? null;

  const flagValue = getFeatureFlagValue("phase5_instances_play");
  const isPlaceholder = flagValue === "placeholder";

  const { closure } = useInstanceLifecycle(instanceId);
  const { isReconciling } = useReconnectReconciliation(instanceId);

  const isClosed =
    closure !== null &&
    (closure.status === "closed" || closure.status === "cancelled");

  // Feature flag: render placeholder.
  if (isPlaceholder) {
    return (
      <div className={className}>
        <PlaceholderView />
      </div>
    );
  }

  // Closed state: show the closed summary, hide play components.
  if (isClosed) {
    return (
      <div className={className} data-testid="instance-game-view">
        {/* Connection status */}
        <div className="mb-4">
          <GameConnectionStatus connectionState="disconnected" />
        </div>

        <InstanceClosedSummary
          instanceId={instanceId}
          currentPlayerId={currentPlayerId}
        />
      </div>
    );
  }

  // Active game layout.
  return (
    <div
      className={className}
      data-testid="instance-game-view"
      role="main"
      aria-label="Game session"
    >
      {/* Connection status */}
      <div className="mb-4">
        <GameConnectionStatus connectionState="connected" />
      </div>

      {/* Reconnect notice */}
      <div className="mb-4">
        <ReconnectDuringGameNotice instanceId={instanceId} />
      </div>

      {/* Two-column layout: main content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column: question + options + timer + submission */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question */}
          <section aria-label="Question">
            <QuestionCard instanceId={instanceId} />
          </section>

          {/* Options */}
          <section aria-label="Answer options">
            <AnswerOptions instanceId={instanceId} />
          </section>

          {/* Timer */}
          <section aria-label="Timer">
            <QuestionTimer instanceId={instanceId} />
          </section>

          {/* Submission state */}
          <section aria-label="Submission status">
            <GameAnswerSubmissionState instanceId={instanceId} />
          </section>
        </div>

        {/* Sidebar: progress + leaderboard */}
        <div className="space-y-6">
          {/* Player progress */}
          <section aria-label="Your progress">
            <PlayerProgressPanel instanceId={instanceId} />
          </section>

          {/* Live leaderboard */}
          <section aria-label="Leaderboard">
            <LiveLeaderboard
              instanceId={instanceId}
              currentPlayerId={currentPlayerId}
            />
          </section>
        </div>
      </div>

      {/* Post-game result overlay (when closure received) */}
      {closure && !isClosed && closure.finalLeaderboard && (
        <div className="mt-6 pt-6 border-t">
          <GameResult
            instanceId={instanceId}
            currentPlayerId={currentPlayerId}
          />
        </div>
      )}
    </div>
  );
}
