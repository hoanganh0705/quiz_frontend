"use client";

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
IncomingRequestsListPage,
OutgoingRequestsListPage,
} from "@/features/social/pages";
import { FriendRequestEmptyState } from "./FriendRequestEmptyState";
import { PrivacyRestrictedNotice } from "./PrivacyRestrictedNotice";

export type FriendRequestRouteKind = "incoming" | "outgoing";

interface FriendRequestRouteGateProps {

kind: FriendRequestRouteKind;

requireAuth?: boolean;
}

export function FriendRequestRouteGate(
props: FriendRequestRouteGateProps,
): React.ReactElement {
const { kind, requireAuth = false } = props;

const parentFlag = useMemo(
() => getFeatureFlagValue("social_live"),
[],
  );
const readFlag = useMemo(
() => getFeatureFlagValue("social_relationship_live"),
[],
  );

const { isAuthenticated } = useAuthState();
if (requireAuth && !isAuthenticated) {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="blocked"
      />
    );
  }

if (parentFlag === "placeholder" || readFlag === "placeholder") {
return <FriendRequestEmptyState kind={kind} />;
  }

if (kind === "incoming") {
return <IncomingRequestsListPage />;
  }
return <OutgoingRequestsListPage />;
}