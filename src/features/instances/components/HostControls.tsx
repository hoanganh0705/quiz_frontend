"use client";

import { useCallback, useState } from "react";

import {
  LoaderCircle,
  Play,
  RotateCcw,
  StopCircle,
  XCircle,
} from "lucide-react";

import { ApiError, coerceToApiError } from "@/lib/api";

import { useCloseInstance } from "@/features/instances/hooks/useCloseInstance";
import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstancePermissions } from "@/features/instances/hooks/useInstancePermissions";
import { useInstanceRealtimeBridge } from "@/features/instances/hooks/useInstanceRealtimeBridge";
import { useStartInstance } from "@/features/instances/hooks/useStartInstance";
import { cancelCountdown } from "@/features/instances/services/instances.service";
import {
  selectInstanceRealtimeStatus,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";

import { Button } from "@/components/ui/Button";

import { cn } from "@/shared/utils/merge-class-names";

import { InstanceErrorState } from "./shared";

import type {
  InstanceLifecycleErrorCode,
  InstanceStatus,
} from "@/features/instances/types/instance.types";

export interface HostControlsProps {
  instanceId: string | null;
  currentUserId?: string | null;
  className?: string;
}

const STALE_ROLE_ERROR_CODES: ReadonlySet<InstanceLifecycleErrorCode> = new Set(
  ["INSTANCE_HOST_REQUIRED", "INSTANCE_FORBIDDEN", "GLOBAL_FORBIDDEN"],
);

function isStaleRoleErrorCode(
  code: string | undefined,
): code is InstanceLifecycleErrorCode {
  if (!code) return false;
  return STALE_ROLE_ERROR_CODES.has(code as InstanceLifecycleErrorCode);
}

export function HostControls({
  instanceId,
  currentUserId = null,
  className,
}: HostControlsProps) {
  useInstanceRealtimeBridge(instanceId);

  const permissions = useInstancePermissions(instanceId, {
    ...(currentUserId !== null ? { currentUserId } : {}),
  });
  const { instance, refresh: refreshInstance } = useInstance(
    instanceId,
    currentUserId,
  );

  const realtimeStatus = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimeStatus(state, instanceId),
  );
  const status: InstanceStatus | null =
    realtimeStatus ?? instance?.status ?? null;

  const {
    start,
    state: startState,
    error: startError,
    reset: resetStart,
  } = useStartInstance(instanceId, permissions, { status });
  const {
    close,
    state: closeState,
    error: closeError,
    reset: resetClose,
  } = useCloseInstance(instanceId, permissions);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<ApiError | null>(null);

  const handleStart = useCallback(async () => {
    resetClose();
    setCancelError(null);
    await start();
    void refreshInstance();
  }, [start, resetClose, refreshInstance]);

  const handleCancelCountdown = useCallback(async () => {
    if (instanceId === null || isCancelling) return;
    resetStart();
    resetClose();
    setCancelError(null);
    setIsCancelling(true);
    try {
      await cancelCountdown(instanceId);
      useInstanceRealtimeStore.getState().applyLifecycleEvent({
        type: "countdown_cancelled",
        instanceId,
        at: new Date().toISOString(),
        eventSequence: Date.now(),
        status: "open",
      });
      void refreshInstance();
    } catch (cause: unknown) {
      setCancelError(coerceToApiError(cause));
    } finally {
      setIsCancelling(false);
    }
  }, [instanceId, isCancelling, resetStart, resetClose, refreshInstance]);

  const handleClose = useCallback(async () => {
    resetStart();
    setCancelError(null);
    await close();
    void refreshInstance();
  }, [close, resetStart, refreshInstance]);

  if (instanceId === null) return null;
  if (permissions.role !== "host") return null;

  const canStart = permissions.canStart === true;
  const canCancel = permissions.canCancel === true;
  const canClose = permissions.canClose === true;

  if (!canStart && !canCancel && !canClose) return null;

  const startPending = startState === "pending";
  const closePending = closeState === "pending";
  const isBusy = startPending || closePending || isCancelling;

  const activeError: ApiError | null =
    startError !== null
      ? startError
      : cancelError !== null
        ? cancelError
        : closeError !== null
          ? closeError
          : null;

  const disabledByStaleRole =
    activeError !== null && isStaleRoleErrorCode(activeError.code);

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-testid="host-controls"
      role="region"
      aria-label="Host controls"
    >
      {canStart && (
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={handleStart}
          disabled={isBusy || disabledByStaleRole}
          aria-busy={startPending}
          data-testid="host-start-cta"
          className="h-12 w-full gap-2 text-base font-bold bg-brand hover:bg-brand-hover text-white shadow-xs active:scale-[0.99] transition-all rounded-xl"
        >
          {startPending ? (
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Play className="h-5 w-5 fill-current" aria-hidden />
          )}
          {startPending
            ? "Starting…"
            : status === "countdown"
              ? "Start Now"
              : "Start Match"}
        </Button>
      )}

      {canCancel && (
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleCancelCountdown}
          disabled={isBusy || disabledByStaleRole}
          aria-busy={isCancelling}
          data-testid="host-cancel-countdown-cta"
          className="h-10 w-full gap-2 text-sm font-semibold rounded-xl text-amber-700 border-amber-500/40 hover:bg-amber-500/10 dark:text-amber-300 active:scale-[0.99] transition-all"
        >
          {isCancelling ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden />
          )}
          {isCancelling ? "Cancelling…" : "Cancel Countdown"}
        </Button>
      )}

      {canClose && (
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleClose}
          disabled={isBusy || disabledByStaleRole}
          aria-busy={closePending}
          data-testid="host-close-cta"
          className="h-10 w-full gap-2 text-sm font-semibold rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 active:scale-[0.99] transition-all"
        >
          {closePending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden />
          )}
          {closePending ? "Closing Room…" : "Close Room"}
        </Button>
      )}

      {activeError !== null && (
        <div role="alert" aria-live="polite" data-testid="host-controls-error">
          <InstanceErrorState
            error={activeError}
            onRetry={() => {
              resetStart();
              resetClose();
              setCancelError(null);
            }}
          />
        </div>
      )}

      {/* Inline hint while the stale role blocks further invocations. */}
      {disabledByStaleRole && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="host-controls-stale-role"
        >
          <StopCircle
            className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom"
            aria-hidden
          />
          Controls are disabled because your role has changed. Refresh to
          continue.
        </p>
      )}
    </div>
  );
}
