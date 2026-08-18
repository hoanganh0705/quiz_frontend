

"use client";

import { useMemo, type ReactElement, type ReactNode } from "react";

import { useFriendRequestInvalidation } from "@/features/social/hooks/useFriendRequestInvalidation";
import { useFollowInvalidation } from "@/features/social/hooks/useFollowInvalidation";
import { useBlockInvalidation } from "@/features/social/hooks/useBlockInvalidation";
import { useSocialFeedInvalidation } from "@/features/social/hooks/useSocialFeedInvalidation";
import { useNotificationEventRouter } from "@/features/social/hooks/useNotificationEventRouter";
import { useReconnectReconciliation } from "@/features/social/hooks/useReconnectReconciliation";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import { BadgeSyncLayer } from "./BadgeSyncLayer";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { RealtimeWsErrorToast } from "./RealtimeWsErrorToast";

import {
EventDeduplicator,
EventDeduplicatorContext,
} from "@/features/social/realtime/event-deduplicator";
import {
EventSequenceGuard,
EventSequenceGuardContext,
} from "@/features/social/realtime/event-sequence-guard";

import { getFeatureFlagValue } from "@/lib/feature-flags/feature-flags";

export interface RealtimeSocialShellProps {

children: ReactNode;
}

function TabScopedListeners(): null {
useFriendRequestInvalidation();
useFollowInvalidation();
useBlockInvalidation();
useSocialFeedInvalidation(null);
useNotificationEventRouter();
useReconnectReconciliation();
return null;
}

function UiPrimitives(): ReactElement {
return (
<>
<BadgeSyncLayer />
<ConnectionStatusBadge />
<RealtimeWsErrorToast />
</>
  );
}

export function RealtimeSocialShell({
children,
}: RealtimeSocialShellProps): ReactElement {

const flagValue = getFeatureFlagValue("social_realtime_notifications_live");

const auth = useAuthSession();
const isAuthenticated = auth.currentUser !== null;

const dedup = useMemo(
() => (flagValue === "live" && isAuthenticated ? new EventDeduplicator() : null),
[flagValue, isAuthenticated],
  );
const sequenceGuard = useMemo(
() =>
flagValue === "live" && isAuthenticated ? new EventSequenceGuard() : null,
[flagValue, isAuthenticated],
  );

return (
<EventDeduplicatorContext.Provider value={dedup}>
<EventSequenceGuardContext.Provider value={sequenceGuard}>
{flagValue === "live" && isAuthenticated ? <TabScopedListeners /> : null}
<UiPrimitives />
{children}
</EventSequenceGuardContext.Provider>
</EventDeduplicatorContext.Provider>
  );
}