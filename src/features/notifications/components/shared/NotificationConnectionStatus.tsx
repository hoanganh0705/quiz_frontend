"use client";

/**
 * `NotificationConnectionStatus.tsx` — compact socket connection-status
 * indicator.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.C2.
 *
 * Renders a non-interactive visual indicator that maps the
 * `useNotificationSocket()` connection state to one of four statuses:
 *
 *   - `'connected'`   — green dot + optional "Live" label
 *   - `'reconnecting'` — amber spinner + "Reconnecting…" label
 *   - `'disconnected'` — gray dot + "Offline" label
 *   - `'auth_required'` and any errored state — red dot + "Connection error" label
 *
 * The component is purely presentational; it never re-opens or
 * disconnects the socket. Consumers compose the refresh/retry action
 * via `NotificationBell` or the popover.
 */

import { cn } from "@/shared/utils/merge-class-names";
import { Loader2, Wifi, WifiOff, AlertTriangle } from "lucide-react";

import type { SocketConnectionState } from "@/lib/realtime";

export interface NotificationConnectionStatusProps {
  /** The socket state from `useNotificationSocket().connectionState`. */
  connectionState: SocketConnectionState;
  /** True when a connection error is currently set. */
  hasError?: boolean;
  /** When `false`, the indicator is rendered as a dot only. Default: `true`. */
  showLabel?: boolean;
  /** Optional className for the root. */
  className?: string;
  /** Optional size preset. */
  size?: "sm" | "md";
}

type IndicatorState = "connected" | "reconnecting" | "disconnected" | "error";

function deriveIndicatorState(
  connectionState: SocketConnectionState,
  hasError: boolean,
): IndicatorState {
  if (hasError || connectionState === "auth_required") return "error";
  if (connectionState === "connected") return "connected";
  if (connectionState === "reconnecting" || connectionState === "connecting")
    return "reconnecting";
  return "disconnected";
}

const STATE_PRESENTATION: Record<
  IndicatorState,
  { label: string; dotClass: string; iconClass: string; Icon: typeof Wifi | typeof WifiOff | typeof AlertTriangle | typeof Loader2; iconSpin: boolean }
> = {
  connected: {
    label: "Live",
    dotClass: "bg-emerald-500",
    iconClass: "text-emerald-500",
    Icon: Wifi,
    iconSpin: false,
  },
  reconnecting: {
    label: "Reconnecting…",
    dotClass: "bg-amber-500",
    iconClass: "text-amber-500",
    Icon: Loader2,
    iconSpin: true,
  },
  disconnected: {
    label: "Offline",
    dotClass: "bg-slate-400",
    iconClass: "text-slate-400",
    Icon: WifiOff,
    iconSpin: false,
  },
  error: {
    label: "Connection error",
    dotClass: "bg-red-500",
    iconClass: "text-red-500",
    Icon: AlertTriangle,
    iconSpin: false,
  },
};

export function NotificationConnectionStatus({
  connectionState,
  hasError = false,
  showLabel = true,
  className,
  size = "sm",
}: NotificationConnectionStatusProps) {
  const indicator = deriveIndicatorState(connectionState, hasError);
  const presentation = STATE_PRESENTATION[indicator];

  const isSm = size === "sm";
  const dotSize = isSm ? "h-2 w-2" : "h-2.5 w-2.5";
  const iconSize = isSm ? "h-3 w-3" : "h-4 w-4";
  const textClass = isSm ? "text-[0.65rem]" : "text-xs";

  const dot = (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        dotSize,
        presentation.dotClass,
      )}
      aria-hidden="true"
    />
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 select-none",
        textClass,
        "text-muted-foreground",
        className,
      )}
      data-testid="notification-connection-status"
      data-state={indicator}
      aria-live="polite"
    >
      {showLabel ? (
        <>
          <presentation.Icon
            className={cn(
              iconSize,
              presentation.iconClass,
              presentation.iconSpin && "animate-spin",
            )}
            aria-hidden="true"
          />
          <span>{presentation.label}</span>
        </>
      ) : (
        dot
      )}
    </div>
  );
}
