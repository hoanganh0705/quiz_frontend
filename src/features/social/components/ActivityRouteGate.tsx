"use client";

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { UserActivityStream } from "@/features/social/lists/UserActivityStream";

interface ActivityRouteGateProps {
  targetUserId: string;
}

export function ActivityRouteGate(
  props: ActivityRouteGateProps,
): React.ReactElement {
  const { targetUserId } = props;

  const { isAuthenticated } = useAuthState();

  if (!isAuthenticated) {
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind="activity"
      />
    );
  }

  return <UserActivityStream targetUserId={targetUserId} />;
}
