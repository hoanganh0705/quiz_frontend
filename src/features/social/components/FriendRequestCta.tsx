"use client";

import { type ReactElement, useState } from "react";
import {
Ban,
Clock,
Loader,
RefreshCw,
UserCheck,
UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import { FriendRequestCancelDialog } from "@/features/social/components/FriendRequestCancelDialog";
import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";
import { FriendRequestRespondActions } from "@/features/social/components/FriendRequestRespondActions";
import { SelfActionGate } from "@/features/social/components/SelfActionGate";
import {
FRIEND_REQUEST_CTA_TESTIDS,
type FriendRequestActionKind,
type FriendRequestUiState,
resolveFriendRequestUiState,
} from "@/features/social/components/friend-request-state-machine";
import { useRelationship } from "@/features/social/hooks/useRelationship";
import { useSendFriendRequest } from "@/features/social/hooks/useSendFriendRequest";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import { useUnfriend } from "@/features/social/hooks/useUnfriend";
import { UnfriendConfirmDialog } from "@/features/social/components/UnfriendConfirmDialog";

export interface FriendRequestCtaProps {

readonly targetUserId: string;

readonly incomingFriendshipId?: string | null;

readonly outgoingFriendshipId?: string | null;

readonly className?: string;
}

function iconFor(state: FriendRequestUiState): ReactElement {
switch (state.icon) {
case "UserPlus":
return <UserPlus className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
case "UserCheck":
return <UserCheck className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
case "Clock":
return <Clock className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
case "Ban":
return <Ban className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
case "Loader":
return <Loader className="mr-1.5 inline-block h-4 w-4 animate-spin" aria-hidden="true" />;
case "RefreshCw":
return <RefreshCw className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
default: {
const _exhaustive: never = state.icon;
return _exhaustive;
    }
  }
}

const BUTTON_BASE =
"h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function FriendRequestCta({
targetUserId,
incomingFriendshipId = null,
outgoingFriendshipId = null,
className,
}: FriendRequestCtaProps): ReactElement | null {

const flagValue = getFeatureFlagValue(
"social_friend_request_mutation_live",
  );
const isFlagPlaceholder = flagValue === "placeholder";

const { relationship, isLoading } = useRelationship(targetUserId);

const { canFriendRequest, canUnfriend } = useSocialPermissions(targetUserId);

const { send, isPending: isSendPending, error: sendError } =
useSendFriendRequest(targetUserId);
const { isPending: isUnfriendPending } = useUnfriend(targetUserId);

const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false);
const [respondPopoverOpen, setRespondPopoverOpen] = useState(false);

if (isFlagPlaceholder) {
return null;
  }

const isPending = isSendPending || isUnfriendPending;
const localHookState = isPending
? ("pending" as const)
: sendError !== null
? ("error" as const)
: ("idle" as const);

const ctaState = resolveFriendRequestUiState({
relationship,
localHookState,
canFriendRequest,
canUnfriend,
  });

if (isLoading) {
return null;
  }

const handleClick = () => {
const action: FriendRequestActionKind = ctaState.onClick;
switch (action) {
case "send":
send();
return;
case "openCancel":
setCancelDialogOpen(true);
return;
case "openRespond":
setRespondPopoverOpen(true);
return;
case "openUnfriend":
setUnfriendDialogOpen(true);
return;
case null:
return;
default: {
const _exhaustive: never = action;
return _exhaustive;
      }
    }
  };

return (
<SelfActionGate targetUserId={targetUserId} fallback={null}>
<BlockedContentGate targetUserId={targetUserId} fallback={null}>
<div
data-testid="friend-request-cta-root"
data-target-user-id={targetUserId}
data-action-kind={ctaState.onClick ?? "none"}
data-state-relationship={relationship}
className={className}
        >
<Button
type="button"
variant={
ctaState.onClick === "openUnfriend"
? "secondary"
: ctaState.onClick === "openCancel"
? "secondary"
: "default"
            }
className={BUTTON_BASE}
data-testid={ctaState.dataTestid}
aria-label={ctaState.ariaLabel}
aria-pressed={
ctaState.onClick === "openUnfriend" ? true : undefined
            }
disabled={ctaState.disabled}
onClick={handleClick}
          >
{iconFor(ctaState)}
{ctaState.label}
</Button>

{/* Outgoing-request cancel dialog (TKT-6.8.E3) */}
{outgoingFriendshipId !== null && (
<FriendRequestCancelDialog
open={cancelDialogOpen}
onOpenChange={setCancelDialogOpen}
friendshipId={outgoingFriendshipId}
targetUserId={targetUserId}
            />
          )}

{/* Unfriend confirm dialog (TKT-6.8.E4) */}
<UnfriendConfirmDialog
open={unfriendDialogOpen}
onOpenChange={setUnfriendDialogOpen}
targetUserId={targetUserId}
          />

{/* Inline respond popover (TKT-6.8.E3) */}
{incomingFriendshipId !== null && (
<FriendRequestRespondActions
targetUserId={targetUserId}
friendshipId={incomingFriendshipId}
open={respondPopoverOpen}
onOpenChange={setRespondPopoverOpen}
            />
          )}

{/* Error banner — only when the send mutation fails. Unfriend
              errors are surfaced inside `UnfriendConfirmDialog`. */}
{sendError !== null && !isPending && (
<FriendRequestErrorBanner
error={sendError}
onAction={() => send()}
            />
          )}
</div>
</BlockedContentGate>
</SelfActionGate>
  );
}

export { FRIEND_REQUEST_CTA_TESTIDS };
