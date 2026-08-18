"use client";

import { type ReactElement, useEffect, useRef } from "react";

import { useFriends } from "@/features/social/hooks/useFriends";
import { useSocialListLifecycleReset } from "@/features/social/hooks/useSocialListLifecycleReset";
import { useSocialListUrlState } from "@/features/social/hooks/useSocialListUrlState";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import type { ApiError } from "@/lib/api";

import { publishSocialListLoaded } from "@/lib/social/social-list-loaded-broadcast-channel";
import { addSocialListBreadcrumb } from "@/lib/social/social-search-sentry";

import { SocialListEmptyState } from "../components/SocialListEmptyState";
import { SocialListErrorState } from "../components/SocialListErrorState";
import { PrivacyRestrictedNotice } from "../components/PrivacyRestrictedNotice";
import { SocialListRow } from "../components/SocialListRow";
import { SocialListSkeleton } from "../components/SocialListSkeleton";

interface FriendsListProps {
targetUserId: string;
viewerIsOwner: boolean;
}

const FRIENDS_LIST_FORBIDDEN_CODES = new Set<string>([
"SOCIAL_FRIEND_LIST_FORBIDDEN",
"GLOBAL_FORBIDDEN",
]);

function isForbiddenError(error: ApiError | null): boolean {
if (error === null) return false;
if (typeof error.code === "string" && FRIENDS_LIST_FORBIDDEN_CODES.has(error.code)) {
return true;
  }
return error.status === 403;
}

export function FriendsList(props: FriendsListProps): ReactElement {
const { targetUserId, viewerIsOwner } = props;

const visibility = useSocialListVisibility(targetUserId);

const urlState = useSocialListUrlState(targetUserId);
const { reset } = urlState;

useSocialListLifecycleReset({ targetUserId, reset });

const { users, isLoading, isStale, hasMore, loadMore, error, retry } =
useFriends(targetUserId);

const prevFetchStateRef = useRef<"loading" | "done" | "error">(
isLoading ? "loading" : error !== null ? "error" : "done",
  );
useEffect(() => {
if (!visibility.canViewFriends) return;
const next: "loading" | "done" | "error" = isLoading
? "loading"
: error !== null
? "error"
: "done";
if (prevFetchStateRef.current === next) return;
prevFetchStateRef.current = next;
addSocialListBreadcrumb({
kind: "friends",
targetUserId,
offset: urlState.cursor !== null ? Number(urlState.cursor) : 0,
limit: urlState.limit,
total: users.length,
status: error !== null ? error.status : 200,
code: error !== null ? error.code : undefined,
    });
  }, [
visibility.canViewFriends,
isLoading,
error,
targetUserId,
urlState.cursor,
urlState.limit,
users.length,
  ]);

const handleLoadMore = (): void => {
loadMore();
publishSocialListLoaded({
kind: "friends",
targetUserId,
offset: users.length,
limit: urlState.limit,
    });
  };

if (!visibility.canViewFriends) {
return (
<PrivacyRestrictedNotice
variant="friends_only"
resourceKind="friends"
      />
    );
  }

if (isForbiddenError(error)) {
return (
<PrivacyRestrictedNotice
variant="friends_only"
resourceKind="friends"
      />
    );
  }

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
return <SocialListEmptyState kind="friends" viewerIsOwner={viewerIsOwner} />;
  }

return (
<section
data-testid="friends-list"
aria-label="Friends"
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
data-testid="friends-list-load-more"
className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
Load more
        </button>
      )}
</section>
  );
}