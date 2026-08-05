"use client";

/**
 * `HostControls` — host-only start / cancel / close controls for the
 * instance lobby.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.D4.
 *
 * ## Purpose
 *
 * Render the host-only start, cancel, and close controls when
 * `useInstancePermissions` grants them. Errors from `useStartInstance`
 * and `useCloseInstance` are surfaced with typed `InstanceLifecycleErrorCode`
 * copy via `getUserCopy` (Epic 5.1 D3). The component renders nothing
 * for non-host users.
 *
 * ## States
 *
 * 1. **Host + `status: 'open'`/`'countdown'`**: Start + Cancel visible.
 * 2. **Host + `status: 'running'`/`'countdown'`**: Close visible.
 * 3. **Non-host**: nothing rendered.
 * 4. **Pending**: button disabled with inline spinner.
 * 5. **`INSTANCE_HOST_REQUIRED` / `INSTANCE_INVALID_TRANSITION`**:
 *    typed copy + CTA disabled (the stale-role guard surfaces a typed
 *    rejection if the local role disagrees with the server).
 */

import { useCallback } from "react";
import { Play, StopCircle, XCircle, LoaderCircle } from "lucide-react";

import { ApiError } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstancePermissions } from "@/features/instances/hooks/useInstancePermissions";
import { useStartInstance } from "@/features/instances/hooks/useStartInstance";
import { useCloseInstance } from "@/features/instances/hooks/useCloseInstance";
import type { InstanceLifecycleErrorCode } from "@/features/instances/types/instance.types";

import { InstanceErrorState } from "./shared";

export interface HostControlsProps {
  /** Instance id; the component renders nothing when `null`. */
  instanceId: string | null;
  /** Optional override for the current user id. */
  currentUserId?: string | null;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const HOST_ERROR_CODES: ReadonlySet<InstanceLifecycleErrorCode> = new Set([
  "INSTANCE_HOST_REQUIRED",
  "INSTANCE_INVALID_TRANSITION",
  "INSTANCE_FORBIDDEN",
  "INSTANCE_AUTH_REQUIRED",
  "INSTANCE_NOT_FOUND",
  "INSTANCE_CLOSED",
  "GLOBAL_FORBIDDEN",
  "GLOBAL_UNAUTHENTICATED",
]);

function isHostErrorCode(code: string | undefined): code is InstanceLifecycleErrorCode {
  if (!code) return false;
  return HOST_ERROR_CODES.has(code as InstanceLifecycleErrorCode);
}

// ─── Component ────────────────────────────────────────────────────────────

export function HostControls({
  instanceId,
  currentUserId = null,
  className,
}: HostControlsProps) {
  const permissions = useInstancePermissions(instanceId, {
    ...(currentUserId !== null ? { currentUserId } : {}),
  });

  const {
    start,
    state: startState,
    error: startError,
    reset: resetStart,
  } = useStartInstance(instanceId, permissions);
  const {
    close,
    state: closeState,
    error: closeError,
    reset: resetClose,
  } = useCloseInstance(instanceId, permissions);

  const handleStart = useCallback(async () => {
    resetClose();
    await start();
  }, [start, resetClose]);

  const handleClose = useCallback(async () => {
    resetStart();
    await close();
  }, [close, resetStart]);

  // ─── Visibility rules ─────────────────────────────────────────────────

  if (instanceId === null) return null;
  if (permissions.role !== "host") return null;

  const canStart = permissions.canStart === true;
  const canClose = permissions.canClose === true;

  if (!canStart && !canClose) return null;

  // ─── Derived state ────────────────────────────────────────────────────

  const startPending = startState === "pending";
  const closePending = closeState === "pending";

  const activeError: ApiError | null =
    startError !== null
      ? startError
      : closeError !== null
        ? closeError
        : null;

  const hasActiveHostError =
    activeError !== null && isHostErrorCode(activeError.code);

  // When the server rejects with a host-required / invalid-transition
  // error, the local role has slipped out of sync. Disable further
  // invocations until the user re-fetches the detail (which usually
  // happens via the realtime bridge).
  const disabledByStaleRole = hasActiveHostError;

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
          onClick={handleStart}
          disabled={startPending || closePending || disabledByStaleRole}
          aria-busy={startPending}
          data-testid="host-start-cta"
          className="gap-2 bg-default hover:bg-default-hover text-white"
        >
          {startPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
          {startPending ? "Starting…" : "Start"}
        </Button>
      )}

      {canClose && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={startPending || closePending || disabledByStaleRole}
          aria-busy={closePending}
          data-testid="host-close-cta"
          className="gap-2"
        >
          {closePending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden />
          )}
          {closePending ? "Closing…" : "Close"}
        </Button>
      )}

      {hasActiveHostError && activeError !== null && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="host-controls-error"
        >
          <InstanceErrorState
            error={activeError}
            onRetry={() => {
              resetStart();
              resetClose();
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
          <StopCircle className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden />
          Controls are disabled because your role has changed. Refresh to continue.
        </p>
      )}
    </div>
  );
}