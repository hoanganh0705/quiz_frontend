"use client";

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { SocialActivityPlaceholder } from "@/features/social/components/SocialActivityPlaceholder";
import { UserActivityStream } from "@/features/social/lists/UserActivityStream";
import { getFeatureFlagValue } from "@/lib/feature-flags";

interface ActivityRouteGateProps {

targetUserId: string;
}

export function ActivityRouteGate(
props: ActivityRouteGateProps,
): React.ReactElement {
const { targetUserId } = props;

const parentFlag = useMemo(
() => getFeatureFlagValue("social_live"),
[],
  );
const activityFlag = useMemo(
() => getFeatureFlagValue("social_activity_live"),
[],
  );

const { isAuthenticated } = useAuthState();

if (!isAuthenticated) {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="activity"
      />
    );
  }

if (parentFlag === "placeholder" || activityFlag === "placeholder") {
return (
<SocialActivityPlaceholder targetUserId={targetUserId} />
    );
  }

return <UserActivityStream targetUserId={targetUserId} />;
}