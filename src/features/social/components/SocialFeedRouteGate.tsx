"use client";

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { RealtimeSocialShell } from "@/features/social/components/RealtimeSocialShell";
import { SocialFeedPage } from "@/features/social/pages/SocialFeedPage";

export function SocialFeedRouteGate(): React.ReactElement {
  
  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  if (!isAuthenticated) {
    return (
      <PrivacyRestrictedNotice variant="not_available" resourceKind="feed" />
    );
  }

  return (
    <RealtimeSocialShell>
      <SocialFeedPage />
    </RealtimeSocialShell>
  );
}

export const __testing = {
    };
