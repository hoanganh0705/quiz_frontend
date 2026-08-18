"use client";

import {
type ReactElement,
useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { FriendRequestCancelDialog } from "@/features/social/components/FriendRequestCancelDialog";
import { FriendRequestEmptyState } from "@/features/social/components/FriendRequestEmptyState";
import { FriendRequestItem } from "@/features/social/components/FriendRequestItem";
import { FriendRequestSkeleton } from "@/features/social/components/FriendRequestSkeleton";
import { SocialListErrorState } from "@/features/social/components/SocialListErrorState";
import { useOutgoingRequests } from "@/features/social/hooks/useOutgoingRequests";

export interface OutgoingRequestsListPageProps {

readonly currentUserId?: string | null;
}

export function OutgoingRequestsListPage({
}: OutgoingRequestsListPageProps): ReactElement {

const readFlag = getFeatureFlagValue("social_relationship_live");
const isFlagPlaceholder = readFlag === "placeholder";

const { requests, isLoading, error, retry } = useOutgoingRequests();

const [openCancelForId, setOpenCancelForId] = useState<string | null>(null);

if (isFlagPlaceholder) {
return (
<div data-testid="outgoing-requests-page-placeholder" className="p-6">
<FriendRequestEmptyState kind="outgoing" />
</div>
    );
  }

if (isLoading && requests.length === 0) {
return (
<div data-testid="outgoing-requests-page-loading" className="p-2">
<FriendRequestSkeleton count={5} />
</div>
    );
  }

if (error !== null) {
return (
<div data-testid="outgoing-requests-page-error" className="p-2">
<SocialListErrorState
error={error}
isStale={false}
onRetry={() => {
void retry();
          }}
        />
</div>
    );
  }

if (requests.length === 0) {
return (
<div data-testid="outgoing-requests-page-empty" className="p-6">
<FriendRequestEmptyState kind="outgoing" />
</div>
    );
  }

return (
<div
data-testid="outgoing-requests-page"
className="flex flex-col gap-2 p-4"
    >
<header>
<h1 className="text-lg font-semibold">Outgoing requests</h1>
<p className="text-sm text-muted-foreground">
{requests.length} pending{" "}
{requests.length === 1 ? "request" : "requests"}
</p>
</header>
<ul role="list" className="flex flex-col gap-1">
{requests.map((request) => (
<li key={request.id}>
<FriendRequestItem request={request}>
{(ctx) => (
<>
<Button
type="button"
size="sm"
variant="outline"
onClick={() => setOpenCancelForId(ctx.friendshipId)}
data-testid="outgoing-requests-cancel"
aria-label={`Cancel request to ${request.requester.userName}`}
                  >
Cancel
                  </Button>
<FriendRequestCancelDialog
open={openCancelForId === ctx.friendshipId}
onOpenChange={(nextOpen) => {
if (!nextOpen) setOpenCancelForId(null);
                    }}
friendshipId={ctx.friendshipId}
targetUserId={ctx.targetUserId}
                  />
</>
              )}
</FriendRequestItem>
</li>
        ))}
</ul>
</div>
  );
}
