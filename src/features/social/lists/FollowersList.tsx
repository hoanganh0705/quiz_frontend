"use client";

import { type ReactElement, useEffect, useRef } from "react";

import { useFollowers } from "@/features/social/hooks/useFollowers";
import { useSocialListLifecycleReset } from "@/features/social/hooks/useSocialListLifecycleReset";
import { useSocialListUrlState } from "@/features/social/hooks/useSocialListUrlState";

import { publishSocialListLoaded } from "@/lib/social/social-list-loaded-broadcast-channel";
import { addSocialListBreadcrumb } from "@/lib/social/social-search-sentry";

import { SocialListEmptyState } from "../components/SocialListEmptyState";
import { SocialListErrorState } from "../components/SocialListErrorState";
import { SocialListRow } from "../components/SocialListRow";
import { SocialListSkeleton } from "../components/SocialListSkeleton";

interface FollowersListProps {

targetUserId: string;

viewerIsOwner: boolean;
}

export function FollowersList(props: FollowersListProps): ReactElement {
const { targetUserId, viewerIsOwner } = props;

const urlState = useSocialListUrlState(targetUserId);
const { reset } = urlState;

useSocialListLifecycleReset({ targetUserId, reset });

const { users, isLoading, isStale, hasMore, loadMore, error, retry } =
useFollowers(targetUserId);

const prevFetchStateRef = useRef<"loading" | "done" | "error">(
isLoading ? "loading" : error !== null ? "error" : "done",
  );
useEffect(() => {
const next: "loading" | "done" | "error" = isLoading
? "loading"
: error !== null
? "error"
: "done";
if (prevFetchStateRef.current === next) return;
prevFetchStateRef.current = next;
addSocialListBreadcrumb({
kind: "followers",
targetUserId,
offset: urlState.cursor !== null ? Number(urlState.cursor) : 0,
limit: urlState.limit,
total: users.length,
status: error !== null ? error.status : 200,
code: error !== null ? error.code : undefined,
    });
  }, [isLoading, error, targetUserId, urlState.cursor, urlState.limit, users.length]);

const handleLoadMore = (): void => {
loadMore();
publishSocialListLoaded({
kind: "followers",
targetUserId,
offset: users.length,
limit: urlState.limit,
    });
  };

if (isLoading && users.length === 0) {
return <SocialListSkeleton />;
  }

if (error !== null && users.length === 0) {
return (
<SocialListErrorState
error={error}
isStale={isStale}
onRetry={() => {
void retry();
        }}
      />
    );
  }

if (users.length === 0) {
return <SocialListEmptyState kind="followers" viewerIsOwner={viewerIsOwner} />;
  }

return (
<section
data-testid="followers-list"
aria-label="Followers"
className="flex flex-col gap-2"
    >
<ul className="flex flex-col gap-1">
{users.map((user) => (
<li key={user.userId}>
<SocialListRow user={user} variant="summary" />
</li>
        ))}
</ul>
{hasMore && (
<button
type="button"
onClick={handleLoadMore}
data-testid="followers-list-load-more"
className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
Load more
        </button>
      )}
</section>
  );
}