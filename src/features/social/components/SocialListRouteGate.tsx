"use client";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { BlockedUsersList } from "@/features/social/lists/BlockedUsersList";
import { FollowersList } from "@/features/social/lists/FollowersList";
import { FollowingList } from "@/features/social/lists/FollowingList";
import { FriendsList } from "@/features/social/lists/FriendsList";

import { PrivacyRestrictedNotice } from "./PrivacyRestrictedNotice";
import { SocialListPlaceholder } from "./SocialListPlaceholder";

import type { SocialListKind } from "./SocialListPlaceholder";

interface SocialListRouteGateProps {
  kind: SocialListKind;

  targetUserId?: string | null;

  requireAuth?: boolean;
}

export function SocialListRouteGate(
  props: SocialListRouteGateProps,
): React.ReactElement {
  const { kind, targetUserId, requireAuth = false } = props;

  const { isAuthenticated, currentUser } = useAuthSession();
  if (requireAuth && !isAuthenticated) {
    return (
      <PrivacyRestrictedNotice variant="not_available" resourceKind={kind} />
    );
  }

  if (kind === "blocked") {
    return <BlockedUsersList />;
  }
  if (targetUserId === null || targetUserId === undefined) {
    return (
      <SocialListPlaceholder
        kind={kind}
        {...(targetUserId !== undefined ? { targetUserId } : {})}
      />
    );
  }
  const currentUserId =
    (currentUser as { id?: string; userId?: string } | null)?.id ??
    (currentUser as { userId?: string } | null)?.userId ??
    null;
  const viewerIsOwner = currentUserId !== null && currentUserId === targetUserId;

  if (kind === "followers") {
    return (
      <FollowersList
        targetUserId={targetUserId}
        viewerIsOwner={viewerIsOwner}
      />
    );
  }
  if (kind === "following") {
    return (
      <FollowingList
        targetUserId={targetUserId}
        viewerIsOwner={viewerIsOwner}
      />
    );
  }

  return (
    <FriendsList targetUserId={targetUserId} viewerIsOwner={viewerIsOwner} />
  );
}
