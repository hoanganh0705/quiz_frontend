"use client";

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { FollowersList } from "@/features/social/lists/FollowersList";
import { FollowingList } from "@/features/social/lists/FollowingList";
import { FriendsList } from "@/features/social/lists/FriendsList";
import { BlockedUsersList } from "@/features/social/lists/BlockedUsersList";

import { PrivacyRestrictedNotice } from "./PrivacyRestrictedNotice";
import { SocialListPlaceholder, type SocialListKind } from "./SocialListPlaceholder";

interface SocialListRouteGateProps {

kind: SocialListKind;

targetUserId?: string | null;

requireAuth?: boolean;
}

export function SocialListRouteGate(props: SocialListRouteGateProps): React.ReactElement {
const { kind, targetUserId, requireAuth = false } = props;

const parentFlag = useMemo(
() => getFeatureFlagValue("social_live"),
[],
  );
const relationshipFlag = useMemo(
() => getFeatureFlagValue("social_relationship_live"),
[],
  );

const { isAuthenticated } = useAuthState();
if (requireAuth && !isAuthenticated) {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind={kind}
      />
    );
  }

if (parentFlag === "placeholder" || relationshipFlag === "placeholder") {
return (
<SocialListPlaceholder
kind={kind}
{...(targetUserId !== undefined ? { targetUserId } : {})}
      />
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
const viewerIsOwner = false;

if (kind === "followers") {
return <FollowersList targetUserId={targetUserId} viewerIsOwner={viewerIsOwner} />;
  }
if (kind === "following") {
return <FollowingList targetUserId={targetUserId} viewerIsOwner={viewerIsOwner} />;
  }

return <FriendsList targetUserId={targetUserId} viewerIsOwner={viewerIsOwner} />;
}
