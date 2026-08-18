"use client";

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import type { MutualPreviewKind } from "@/features/social/components/MutualPreview";
import { MutualFollowersList } from "@/features/social/lists/MutualFollowersList";
import { MutualFriendsList } from "@/features/social/lists/MutualFriendsList";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { SocialMutualsPlaceholder } from "@/features/social/components/SocialMutualsPlaceholder";
import type { SocialListKind } from "@/features/social/components/SocialListKind";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export type MutualsRouteKind = Extract<
MutualPreviewKind,
"friends" | "followers"
>;

interface MutualsRouteGateProps {

kind: MutualsRouteKind;

targetUserId: string;
}

export function MutualsRouteGate(
props: MutualsRouteGateProps,
): React.ReactElement {
const { kind, targetUserId } = props;

const parentFlag = useMemo(
() => getFeatureFlagValue("social_live"),
[],
  );
const mutualsFlag = useMemo(
() => getFeatureFlagValue("social_mutuals_live"),
[],
  );

const { isAuthenticated } = useAuthState();

if (!isAuthenticated) {
const resourceKind: SocialListKind =
kind === "friends" ? "mutual-friends" : "mutual-followers";
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind={resourceKind}
      />
    );
  }

if (parentFlag === "placeholder" || mutualsFlag === "placeholder") {
return (
<SocialMutualsPlaceholder kind={kind} targetUserId={targetUserId} />
    );
  }

if (kind === "friends") {
return <MutualFriendsList targetUserId={targetUserId} />;
  }
return <MutualFollowersList targetUserId={targetUserId} />;
}