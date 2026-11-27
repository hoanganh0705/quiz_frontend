"use client";

import { useMemo } from "react";
import { Crown, Sparkles, Timer } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstanceRealtimeBridge } from "@/features/instances/hooks/useInstanceRealtimeBridge";
import {
  selectInstanceRealtimeStatus,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import type { InstanceStatus } from "@/features/instances/types/instance.types";

import { InstanceClosedState } from "./shared";

export interface InstanceStatusBannerProps {
  instanceId: string | null;

  currentUserId?: string | null;
  className?: string;
}

const STATUS_CONFIG: Record<
  InstanceStatus,
  { label: string; variant: string; dotClass: string }
> = {
  open: {
    label: "Open",
    variant:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
  },
  countdown: {
    label: "Starting soon",
    variant:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dotClass: "bg-amber-500",
  },
  running: {
    label: "In progress",
    variant:
      "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dotClass: "bg-blue-500",
  },
  closed: {
    label: "Closed",
    variant:
      "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200 border-slate-200 dark:border-slate-800",
    dotClass: "bg-slate-500",
  },
  finished: {
    label: "Finished",
    variant:
      "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200 border-slate-200 dark:border-slate-800",
    dotClass: "bg-slate-500",
  },
};

const DIFFICULTY_VARIANTS: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

export function InstanceStatusBanner({
  instanceId,
  currentUserId = null,
  className,
}: InstanceStatusBannerProps) {
  useInstanceRealtimeBridge(instanceId);

  const { instance, isLoading } = useInstance(instanceId, currentUserId);

  const restStatus = instance?.status ?? null;

  const realtimeStatus = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimeStatus(state, instanceId),
  );

  const resolved = useMemo<{
    status: InstanceStatus | null;
    isCancelledHint: boolean;
  }>(() => {
    if (realtimeStatus !== null) {
      return {
        status: realtimeStatus,
        isCancelledHint: realtimeStatus === "closed",
      };
    }
    return { status: restStatus, isCancelledHint: false };
  }, [restStatus, realtimeStatus]);

  if (instanceId === null) return null;

  if (resolved.status === "closed" || resolved.status === "finished") {
    return (
      <div
        className={cn("space-y-3", className)}
        data-testid="instance-status-banner"
        role="region"
        aria-label="Instance status"
      >
        <InstanceClosedState
          status={resolved.status}
          cancelled={resolved.isCancelledHint}
        />
      </div>
    );
  }

  if (resolved.status === null) {
    return (
      <div
        className={cn("space-y-3 pb-2", className)}
        data-testid="instance-status-banner"
        data-state="loading"
        role="region"
        aria-label="Instance status"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 w-64 bg-muted/60 rounded-lg animate-pulse" />
          {isLoading ? (
            <Badge
              variant="outline"
              className="font-medium bg-muted text-muted-foreground"
              aria-label="Status: loading"
            >
              Loading…
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-32 bg-muted/40 rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted/40 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[resolved.status];
  const hostName =
    instance?.hostDisplayName || instance?.hostUsername || "Host";
  const difficultyVariant =
    instance?.difficulty && DIFFICULTY_VARIANTS[instance.difficulty.toLowerCase()]
      ? DIFFICULTY_VARIANTS[instance.difficulty.toLowerCase()]
      : "bg-muted text-muted-foreground border-border";

  return (
    <div
      className={cn("space-y-2.5 pb-2 border-b border-border/50", className)}
      data-testid="instance-status-banner"
      data-state={resolved.status}
      role="region"
      aria-label="Instance status"
    >
      {/* Top row: Title & Live Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
          {instance?.quizTitle || "Live Quiz Battle"}
        </h1>

        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 font-semibold text-xs rounded-full shadow-2xs self-start sm:self-auto",
            config.variant,
          )}
          aria-label={`Status: ${config.label}`}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              config.dotClass,
              resolved.status === "open" && "animate-pulse",
            )}
            aria-hidden="true"
          />
          {config.label}
        </Badge>
      </div>

      {/* Subtitle row: Host & Metadata Pills */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
          <span>Hosted by <span className="font-semibold">{hostName}</span></span>
        </span>

        {instance?.difficulty && (
          <>
            <span className="text-muted-foreground/40 hidden sm:inline" aria-hidden="true">•</span>
            <Badge
              variant="outline"
              className={cn("capitalize text-xs font-semibold px-2 py-0.5", difficultyVariant)}
            >
              {instance.difficulty}
            </Badge>
          </>
        )}

        {instance && typeof instance.rewardXp === "number" && instance.rewardXp > 0 && (
          <>
            <span className="text-muted-foreground/40 hidden sm:inline" aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              +{instance.rewardXp} XP
            </span>
          </>
        )}

        {instance && typeof instance.durationMs === "number" && instance.durationMs > 0 && (
          <>
            <span className="text-muted-foreground/40 hidden sm:inline" aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              {(() => {
                const totalSec = Math.round(instance.durationMs / 1000);
                const mins = Math.floor(totalSec / 60);
                const secs = totalSec % 60;
                if (mins > 0 && secs > 0) return `${mins}m ${secs}s total`;
                if (mins > 0) return `${mins}m total`;
                return `${secs}s total`;
              })()}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
