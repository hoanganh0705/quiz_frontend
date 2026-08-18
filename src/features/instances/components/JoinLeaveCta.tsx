"use client";

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

instanceId: string | null;

currentUserId?: string | null;
className?: string;
}

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

if (instanceId === null) return null;

const status = permissions.isAuthenticated;

if (
permissions.canJoin !== true &&
permissions.canLeave !== true
  ) {

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

interface InstanceErrorCopyProps {
error: ApiError;
}

function InstanceErrorCopy({ error }: InstanceErrorCopyProps) {

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