"use client";

import { useCallback } from "react";

import { FriendRequestEmptyState } from "@/features/social/components/FriendRequestEmptyState";
import { FriendRequestItem } from "@/features/social/components/FriendRequestItem";
import { FriendRequestSkeleton } from "@/features/social/components/FriendRequestSkeleton";
import { SocialListErrorState } from "@/features/social/components/SocialListErrorState";
import { useIncomingRequests } from "@/features/social/hooks/useIncomingRequests";
import { useRespondFriendRequest } from "@/features/social/hooks/useRespondFriendRequest";

import { Button } from "@/components/ui/Button";

import type { ReactElement } from "react";

export interface IncomingRequestsListPageProps {
  readonly currentUserId?: string | null;
}

function IncomingRowActions({
  friendshipId,
  targetUserId,
  requesterLabel,
}: {
  friendshipId: string;
  targetUserId: string;
  requesterLabel: string;
}): ReactElement {
  const { respond, isPending } = useRespondFriendRequest(targetUserId, {
    assumeCanRespond: true,
  });

  const handleAccept = useCallback(() => {
    void respond({ friendshipId, action: "accept" });
  }, [friendshipId, respond]);

  const handleDecline = useCallback(() => {
    void respond({ friendshipId, action: "decline" });
  }, [friendshipId, respond]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={handleAccept}
        disabled={isPending}
        data-testid="incoming-requests-accept"
        aria-label={`Accept request from ${requesterLabel}`}
      >
        Accept
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleDecline}
        disabled={isPending}
        data-testid="incoming-requests-decline"
        aria-label={`Decline request from ${requesterLabel}`}
      >
        Decline
      </Button>
    </>
  );
}

export function IncomingRequestsListPage(
  _props: IncomingRequestsListPageProps,
): ReactElement {
  const { requests, isLoading, error, retry } = useIncomingRequests();

  if (isLoading && requests.length === 0) {
    return (
      <div data-testid="incoming-requests-page-loading" className="p-2">
        <FriendRequestSkeleton count={5} />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div data-testid="incoming-requests-page-error" className="p-2">
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
      <div data-testid="incoming-requests-page-empty" className="p-6">
        <FriendRequestEmptyState kind="incoming" />
      </div>
    );
  }

  return (
    <div
      data-testid="incoming-requests-page"
      className="flex flex-col gap-2 p-4"
    >
      <header>
        <h1 className="text-lg font-semibold">Incoming requests</h1>
        <p className="text-sm text-muted-foreground">
          {requests.length} pending{" "}
          {requests.length === 1 ? "request" : "requests"}
        </p>
      </header>
      <ul role="list" className="flex flex-col gap-1">
        {requests.map((request) => (
          <li key={request.id}>
            <FriendRequestItem request={request} direction="incoming">
              {(ctx) => (
                <IncomingRowActions
                  friendshipId={ctx.friendshipId}
                  targetUserId={ctx.targetUserId}
                  requesterLabel={
                    request.requester.userName || request.requesterId
                  }
                />
              )}
            </FriendRequestItem>
          </li>
        ))}
      </ul>
    </div>
  );
}
