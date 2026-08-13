"use client";

/**
 * `InstanceGamePage` — page composition for `/instances/[id]/play`.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.G1.
 *
 * ## Purpose
 *
 * Composes the instance play page from the existing hooks and components
 * (no direct service / store / axios / fetch imports):
 *
 *   - `useInstanceGameSocket`       (TKT-5.8.B1) — gameplay socket bus
 *   - `useRealtimeGameplay`        (TKT-5.8.C1) — realtime bridge
 *   - `useReconnectReconciliation` (TKT-5.8.B8) — reconnect + REST rehydration
 *   - `useInstanceLifecycle`       (TKT-5.8.B6) — answer result + closure
 *   - `useInstancesPlayFeatureFlag` (TKT-5.8.F1) — placeholder gate
 *   - `InstanceGameView`           (TKT-5.8.E5) — composed game layout
 *   - `InstanceClosedSummary`       (TKT-5.8.E5) — host closed summary
 *   - `ReconnectDuringGameNotice`  (TKT-5.8.E5) — mid-game reconnect notice
 *   - `GameSkeleton`              (TKT-5.8.D1) — initial skeleton
 *   - `GameErrorState`            (TKT-5.8.D1) — typed-code error copy
 *
 * ## State machine
 *
 *   - `isPlaceholder === true` → render placeholder message.
 *   - `isLoading === true`    → render `GameSkeleton`.
 *   - `closure.status === 'closed' | 'cancelled'` → render
 *     `InstanceClosedSummary`; play components are hidden.
 *   - `isReconciling === true` → `ReconnectDuringGameNotice` overlays.
 *   - Otherwise → render `<InstanceGameView />`.
 *
 * ## Server authority
 *
 * The page never decides reveal, scoring, or closure. All branching is
 * driven by the typed lifecycle envelope (`useInstanceLifecycle`), the
 * socket connection state (`useInstanceGameSocket`), and the reconnect
 * reconciler (`useReconnectReconciliation`).
 */

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import {
  useInstanceGameSocket,
  useRealtimeGameplay,
  useReconnectReconciliation,
  useInstanceLifecycle,
  useInstancesPlayFeatureFlag,
} from "@/features/instances/play/hooks";

import type { GameplayWsErrorCode } from "@/features/instances/play/types";

import { GameSkeleton } from "../components/shared/GameSkeleton";
import { GameErrorState } from "../components/shared/GameErrorState";
import { InstanceGameView } from "../components/InstanceGameView";
import { InstanceClosedSummary } from "../components/InstanceClosedSummary";
import { ReconnectDuringGameNotice } from "../components/ReconnectDuringGameNotice";

export interface InstanceGamePageProps {
  /** Instance id; renders nothing when `null`. */
  instanceId: string | null;
  /** Optional class name for the page root. */
  className?: string;
}

// ─── Error codes the page renders an explicit error state for ───────────────

const PAGE_ERROR_CODES: ReadonlySet<string> = new Set([
  "INSTANCE_NOT_FOUND",
  "INSTANCE_NOT_STARTED",
  "INSTANCE_CLOSED",
  "NOT_PARTICIPANT",
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "MALFORMED_EVENT",
  "PAYLOAD_VERSION_MISMATCH",
  "SEQUENCE_MISMATCH",
  "TIMEOUT",
  "DISCONNECT",
  "UNKNOWN",
]);

function isPageErrorCode(code: string): code is GameplayWsErrorCode {
  return PAGE_ERROR_CODES.has(code);
}

// ─── Component ────────────────────────────────────────────────────────────

export function InstanceGamePage({
  instanceId,
  className,
}: InstanceGamePageProps) {
  const { isPlaceholder } = useInstancesPlayFeatureFlag();
  const { currentUser } = useAuthSession();
  const currentPlayerId = currentUser?.userId ?? null;

  // ─── Socket + bridge (mounts on render, tears down on unmount) ─────────

  useInstanceGameSocket(instanceId);
  const { bundle, leaderboard, isReconciling } = useRealtimeGameplay(instanceId);
  useReconnectReconciliation(instanceId);
  const { closure, isClosed } = useInstanceLifecycle(instanceId);

  // ─── Feature-flag placeholder ─────────────────────────────────────────

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

  // ─── No instance id ──────────────────────────────────────────────────

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

  // ─── Loading state ───────────────────────────────────────────────────
  //
  // Show skeleton while the per-instance store has no data yet.
  // The store is empty until the first realtime envelope arrives.

  const isInitializing =
    bundle === null && leaderboard.length === 0 && !isReconciling;

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

  // ─── Closed / cancelled ───────────────────────────────────────────────
  //
  // When the instance is closed or cancelled, hide the play components
  // and render the closed summary.

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

  // ─── Live game view ─────────────────────────────────────────────────
  //
  // Normal gameplay surface. ReconnectDuringGameNotice is rendered inside
  // InstanceGameView when reconciling.

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

// ─── Placeholder message ───────────────────────────────────────────────────

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
