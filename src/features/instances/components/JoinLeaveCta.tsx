"use client";

/**
 * `JoinLeaveCta` — player join/leave action CTA for the instance lobby.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.D3.
 *
 * ## Purpose
 *
 * Renders the join CTA for non-joined players and the leave CTA for
 * joined players, gated by `useInstancePermissions`. Errors from
 * `useJoinInstance` and `useLeaveInstance` are surfaced with typed
 * `InstanceLifecycleErrorCode` copy via `getUserCopy` (Epic 5.1 D3).
 *
 * ## States
 *
 * 1. **Unauthenticated**: "Sign in to join" — never the join CTA.
 * 2. **`canJoin === true`**: Join CTA — calls `useJoinInstance`.
 * 3. **`canLeave === true`**: Leave CTA — calls `useLeaveInstance`.
 * 4. **Neither permission**: nothing rendered.
 * 5. **Closed / cancelled**: nothing rendered.
 * 6. **Pending**: button disabled with inline spinner.
 * 7. **Error**: typed copy with retry affordance.
 */

import { useCallback } from "react";
import { LogIn, LogOut, LoaderCircle } from "lucide-react";

import { ApiError } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useInstancePermissions } from "@/features/instances/hooks/useInstancePermissions";
import { useJoinInstance } from "@/features/instances/hooks/useJoinInstance";
import { useLeaveInstance } from "@/features/instances/hooks/useLeaveInstance";
import {
  useInstanceSocket,
} from "@/features/instances/hooks/useInstanceSocket";
import type { InstanceLifecycleErrorCode } from "@/features/instances/types/instance.types";

import { InstanceErrorState } from "./shared";

export interface JoinLeaveCtaProps {
  /** Instance id; the component renders nothing when `null`. */
  instanceId: string | null;
  /** Optional override for the current user id. */
  currentUserId?: string | null;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const JOIN_ERROR_CODES: ReadonlySet<InstanceLifecycleErrorCode> = new Set([
  "INSTANCE_FULL",
  "INSTANCE_CLOSED",
  "INSTANCE_ALREADY_JOINED",
  "INSTANCE_FORBIDDEN",
  "INSTANCE_AUTH_REQUIRED",
  "INSTANCE_NOT_FOUND",
  "GLOBAL_FORBIDDEN",
  "GLOBAL_UNAUTHENTICATED",
]);

const LEAVE_ERROR_CODES: ReadonlySet<InstanceLifecycleErrorCode> = new Set([
  "INSTANCE_NOT_JOINED",
  "INSTANCE_CLOSED",
  "INSTANCE_FORBIDDEN",
  "INSTANCE_AUTH_REQUIRED",
  "INSTANCE_NOT_FOUND",
  "GLOBAL_FORBIDDEN",
  "GLOBAL_UNAUTHENTICATED",
]);

/**
 * Pick the error to display. Both hooks may surface errors during a
 * brief window (e.g. leave fails after join succeeded). Prefer the
 * most-recently-set one.
 */
function pickActiveError(
  joinError: ApiError | null,
  leaveError: ApiError | null,
  joinPending: boolean,
  leavePending: boolean,
): ApiError | null {
  if (leavePending && leaveError !== null) return leaveError;
  if (joinPending && joinError !== null) return joinError;
  if (leaveError !== null) return leaveError;
  if (joinError !== null) return joinError;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────

export function JoinLeaveCta({
  instanceId,
  currentUserId = null,
  className,
}: JoinLeaveCtaProps) {
  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const permissions = useInstancePermissions(instanceId, {
    ...(currentUserId !== null ? { currentUserId } : {}),
  });

  // The leave mutation requires the socket emit function from
  // `useInstanceSocket`. When the socket hook returns `emitLeave ===
  // undefined` (flag off or unauthenticated), `useLeaveInstance`
  // treats the call as a no-op — the CTA still renders the leave
  // button but the call returns immediately.
  const { emitLeave } = useInstanceSocket(instanceId);
  const emitLeaveFn =
    emitLeave !== undefined && instanceId !== null ? emitLeave : null;

  const {
    join,
    state: joinState,
    error: joinError,
    reset: resetJoin,
  } = useJoinInstance(instanceId);
  const {
    leave,
    state: leaveState,
    error: leaveError,
    reset: resetLeave,
  } = useLeaveInstance(instanceId, {
    ...(emitLeaveFn !== null ? { emitLeave: emitLeaveFn } : {}),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleSignIn = useCallback(() => {
    const returnUrl = encodeURIComponent(
      typeof window !== "undefined" ? window.location.pathname : "/",
    );
    if (typeof window !== "undefined") {
      window.location.href = `/sign-in?returnUrl=${returnUrl}`;
    }
  }, []);

  const handleJoin = useCallback(async () => {
    resetLeave();
    await join();
  }, [join, resetLeave]);

  const handleLeave = useCallback(async () => {
    resetJoin();
    await leave();
  }, [leave, resetJoin]);

  // ─── Visibility rules ─────────────────────────────────────────────────

  if (instanceId === null) return null;

  const status = permissions.isAuthenticated;

  if (
    permissions.canJoin !== true &&
    permissions.canLeave !== true
  ) {
    // Closed / finished / not a player / etc.
    if (!status) {
      return null;
    }
    return null;
  }

  const joinPending = joinState === "pending";
  const leavePending = leaveState === "pending";

  const activeError = pickActiveError(
    joinError,
    leaveError,
    joinPending,
    leavePending,
  );

  // ─── Unauthenticated ──────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div
        className={cn("flex flex-col gap-3", className)}
        data-testid="join-leave-cta"
      >
        <Button
          type="button"
          variant="default"
          onClick={handleSignIn}
          className="gap-2 bg-default hover:bg-default-hover text-white"
          data-testid="sign-in-to-join-cta"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Sign in to join
        </Button>
      </div>
    );
  }

  // ─── Render the CTA(s) ────────────────────────────────────────────────

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-testid="join-leave-cta"
    >
      {permissions.canJoin === true && (
        <Button
          type="button"
          variant="default"
          onClick={handleJoin}
          disabled={joinPending || leavePending}
          aria-busy={joinPending}
          data-testid="join-cta"
          className="gap-2 bg-default hover:bg-default-hover text-white"
        >
          {joinPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="h-4 w-4" aria-hidden />
          )}
          {joinPending ? "Joining…" : "Join"}
        </Button>
      )}

      {permissions.canLeave === true && (
        <Button
          type="button"
          variant="outline"
          onClick={handleLeave}
          disabled={joinPending || leavePending}
          aria-busy={leavePending}
          data-testid="leave-cta"
          className="gap-2"
        >
          {leavePending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <LogOut className="h-4 w-4" aria-hidden />
          )}
          {leavePending ? "Leaving…" : "Leave"}
        </Button>
      )}

      {activeError !== null &&
        (JOIN_ERROR_CODES.has(
          activeError.code as InstanceLifecycleErrorCode,
        ) ||
          LEAVE_ERROR_CODES.has(
            activeError.code as InstanceLifecycleErrorCode,
          )) && (
          <div
            role="alert"
            aria-live="polite"
            data-testid="join-leave-error"
          >
            <InstanceErrorCopy error={activeError} />
          </div>
        )}
    </div>
  );
}

// ─── Sub-component (kept in-file) ────────────────────────────────────────

interface InstanceErrorCopyProps {
  error: ApiError;
}

function InstanceErrorCopy({ error }: InstanceErrorCopyProps) {
  // `InstanceErrorState` reads copy from `getUserCopy(error.code)`
  // internally (Epic 5.1 D3); the lookup is not duplicated here.
  return (
    <InstanceErrorState
      error={error}
      onRetry={() => {
        // The CTA itself re-enables once the consumer resets the
        // mutation hook; here we simply re-render the typed copy.
      }}
    />
  );
}