"use client";

import { type ReactElement } from "react";

import { Button } from "@/components/ui/Button";

import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";
import { useRespondFriendRequest } from "@/features/social/hooks/useRespondFriendRequest";

export interface FriendRequestRespondActionsProps {

readonly targetUserId: string;

readonly friendshipId: string;

readonly open: boolean;

readonly onOpenChange: (open: boolean) => void;
}

export function FriendRequestRespondActions({
targetUserId,
friendshipId,
open,
onOpenChange,
}: FriendRequestRespondActionsProps): ReactElement | null {
const { respond, isPending, error } = useRespondFriendRequest(targetUserId);

if (!open) {
return null;
  }

if (typeof friendshipId !== "string" || friendshipId.length === 0) {
return null;
  }

const handleAccept = () => {
respond({ friendshipId, action: "accept" });

onOpenChange(false);
  };

const handleDecline = () => {
respond({ friendshipId, action: "decline" });
onOpenChange(false);
  };

return (
<div
data-testid="friend-request-respond-actions"
data-friendship-id={friendshipId}
data-target-user-id={targetUserId}
role="group"
aria-label="Respond to friend request"
className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 shadow-sm"
    >
<div className="flex items-center gap-2">
<Button
type="button"
size="sm"
variant="default"
onClick={handleAccept}
disabled={isPending}
data-testid="friend-request-respond-accept"
aria-label="Accept friend request"
        >
Accept
        </Button>
<Button
type="button"
size="sm"
variant="outline"
onClick={handleDecline}
disabled={isPending}
data-testid="friend-request-respond-decline"
aria-label="Decline friend request"
        >
Decline
        </Button>
</div>
{error !== null && (
<FriendRequestErrorBanner error={error} onAction={handleAccept} />
      )}
</div>
  );
}
