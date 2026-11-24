"use client";

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";

import type { AnalyticsKind } from "@/features/social/types/analytics";

import { AnalyticsPlaceholder } from "./AnalyticsPlaceholder";
import { PrivacyRestrictedNotice } from "./PrivacyRestrictedNotice";
import { SocialHubPage } from "@/features/social/lists/SocialHubPage";
import { UserStatsCard } from "@/features/social/lists/UserStatsCard";
import { MyAnalyticsPage } from "@/features/social/lists/MyAnalyticsPage";
import { FriendLeaderboardPage } from "@/features/social/lists/FriendLeaderboardPage";

interface AnalyticsRouteGateProps {
  kind: AnalyticsKind;

  targetUserId?: string | null;

  requireAuth?: boolean;
}

export function AnalyticsRouteGate(
  props: AnalyticsRouteGateProps,
): React.ReactElement {
  const { kind, targetUserId, requireAuth = false } = props;
  const { isAuthenticated } = useAuthState();
  if (requireAuth && !isAuthenticated) {
    return (
      <PrivacyRestrictedNotice variant="not_available" resourceKind="blocked" />
    );
  }



  if (kind === "hub") {
    void targetUserId;
    return <SocialHubPage />;
  }
  if (kind === "stats") {
    if (targetUserId === null || targetUserId === undefined) {
      return <AnalyticsPlaceholder kind="stats" targetUserId={targetUserId} />;
    }

    return <UserStatsCard targetUserId={targetUserId} />;
  }
  if (kind === "my-analytics") {
    void targetUserId;
    return <MyAnalyticsPage />;
  }

  void targetUserId;
  return <FriendLeaderboardPage />;
}
