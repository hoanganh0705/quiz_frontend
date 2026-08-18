"use client";

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { RealtimeSocialShell } from "@/features/social/components/RealtimeSocialShell";
import { SocialFeedPlaceholder } from "@/features/social/components/SocialFeedPlaceholder";
import { SocialFeedPage } from "@/features/social/pages/SocialFeedPage";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export function SocialFeedRouteGate(): React.ReactElement {
const parentFlag = useMemo(
() => getFeatureFlagValue("social_live"),
[],
  );
const feedFlag = useMemo(
() => getFeatureFlagValue("social_feed_live"),
[],
  );

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

if (parentFlag === "placeholder" || feedFlag === "placeholder") {
return <SocialFeedPlaceholder />;
  }

if (!isAuthenticated) {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="feed"
      />
    );
  }

return (
<RealtimeSocialShell>
<SocialFeedPage />
</RealtimeSocialShell>
  );
}

export const __testing = {

PARENT_FLAG: "social_live" as const,
FEED_FLAG: "social_feed_live" as const,
};
