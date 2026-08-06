"use client";

/**
 * `GameConnectionStatus` — Socket.IO connection-status banner for the
 * Story 5.8 gameplay surface.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.D1.
 *
 * Maps the typed `GameplaySocketConnectionState` (TKT-5.8.A1) onto a
 * labelled banner with a distinct visual treatment per state:
 *
 *   - `'connecting'`     — amber spinner + "Connecting to the game…"
 *   - `'reconnecting'`   — amber spinner + "Reconnecting to the game…"
 *   - `'disconnected'`   — gray dot + "Offline — data may be stale"
 *   - `'auth_failed'`    — red dot + "Session expired — please sign in"
 *   - `'connected'|'idle'` — renders nothing (no banner needed)
 *
 * Mirrors `InstanceConnectionStatus` (Epic 5.7 TKT-5.7.C1) and
 * `NotificationConnectionStatus` (Epic 5.4 TKT-5.4.C2).
 *
 * The component is purely presentational; it never re-opens or disconnects
 * the socket.
 */

import { AlertTriangle, Loader2, WifiOff } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import type { GameplaySocketConnectionState } from "@/features/instances/play/types";

export interface GameConnectionStatusProps {
  /** The socket state from `useInstanceGameSocket().connectionState`. */
  connectionState: GameplaySocketConnectionState;
  /** Optional className for the root. */
  className?: string;
}

type IndicatorState =
  | "connecting"
  | "reconnecting"
  | "disconnected"
  | "auth_failed";

function deriveIndicatorState(
  connectionState: GameplaySocketConnectionState,
): IndicatorState | null {
  switch (connectionState) {
    case "connecting":
      return "connecting";
    case "reconnecting":
      return "reconnecting";
    case "disconnected":
      return "disconnected";
    case "auth_failed":
      return "auth_failed";
    case "connected":
    case "idle":
      return null;
    default:
      return null;
  }
}

const STATE_PRESENTATION: Record<
  IndicatorState,
  {
    label: string;
    description: string;
    containerClass: string;
    iconClass: string;
    Icon: typeof Loader2 | typeof WifiOff | typeof AlertTriangle;
    iconSpin: boolean;
    role: "status" | "alert";
  }
> = {
  connecting: {
    label: "Connecting to the game…",
    description: "Establishing the realtime connection.",
    containerClass:
      "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    iconClass: "text-amber-500",
    Icon: Loader2,
    iconSpin: true,
    role: "status",
  },
  reconnecting: {
    label: "Reconnecting to the game…",
    description: "Re-establishing the realtime connection.",
    containerClass:
      "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    iconClass: "text-amber-500",
    Icon: Loader2,
    iconSpin: true,
    role: "status",
  },
  disconnected: {
    label: "Offline",
    description:
      "The realtime connection is offline. The data shown may be out of date.",
    containerClass:
      "bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
    iconClass: "text-slate-400",
    Icon: WifiOff,
    iconSpin: false,
    role: "status",
  },
  auth_failed: {
    label: "Session expired",
    description:
      "Your session has expired. Please sign in again to rejoin the game.",
    containerClass:
      "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    iconClass: "text-red-500",
    Icon: AlertTriangle,
    iconSpin: false,
    role: "alert",
  },
};

export function GameConnectionStatus({
  connectionState,
  className,
}: GameConnectionStatusProps) {
  const indicator = deriveIndicatorState(connectionState);
  if (indicator === null) return null;

  const presentation = STATE_PRESENTATION[indicator];
  const { Icon } = presentation;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm",
        presentation.containerClass,
        className,
      )}
      role={presentation.role}
      aria-live="polite"
      data-testid="game-connection-status"
      data-state={indicator}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          presentation.iconClass,
          presentation.iconSpin && "animate-spin",
        )}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-none">{presentation.label}</p>
        <p className="text-xs opacity-80 mt-0.5">{presentation.description}</p>
      </div>
    </div>
  );
}
