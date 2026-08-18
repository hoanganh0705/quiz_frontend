"use client";

import { AlertTriangle, Loader2, WifiOff } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import type { InstanceSocketConnectionState } from "@/features/instances/types/instance.types";

export interface InstanceConnectionStatusProps {

connectionState: InstanceSocketConnectionState;

className?: string;
}

type IndicatorState =
| "connecting"
  | "reconnecting"
  | "disconnected"
  | "auth_failed";

function deriveIndicatorState(
connectionState: InstanceSocketConnectionState,
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
label: "Connecting…",
description: "Establishing the realtime connection.",
containerClass:
"bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
iconClass: "text-amber-500",
Icon: Loader2,
iconSpin: true,
role: "status",
  },
reconnecting: {
label: "Reconnecting…",
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
label: "Reauthentication required",
description:
"Your session has expired. Please sign in again to rejoin the realtime channel.",
containerClass:
"bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
iconClass: "text-red-500",
Icon: AlertTriangle,
iconSpin: false,
role: "alert",
  },
};

export function InstanceConnectionStatus({
connectionState,
className,
}: InstanceConnectionStatusProps) {
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
data-testid="instance-connection-status"
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