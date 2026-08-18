

"use client";

import { useCallback } from "react";

import { useSocket } from "@/lib/realtime/useSocket";
import {
NOTIFICATIONS_NAMESPACE,
NOTIFICATION_SENT,
useRealtimeEvent,
} from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";

import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";

const SOCIAL_NOTIFICATION_KINDS = new Set<string>([
"friend_request",
"follow",
"block",
]);

export function useNotificationEventRouter(): void {
const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
const realtimeEnabled = flagValue !== "placeholder";

const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
autoConnect: realtimeEnabled,
enabled: realtimeEnabled,
  });

const handleNotificationSent = useCallback((raw: unknown) => {
if (raw === null || raw === undefined || typeof raw !== "object") {
return;
    }

const payload = raw as Record<string, unknown>;

const kindCandidate =
typeof payload["type"] === "string"
? (payload["type"] as string)
: typeof (payload["data"] as Record<string, unknown> | undefined)?.["kind"] === "string"
? ((payload["data"] as Record<string, unknown>)["kind"] as string)
: undefined;

if (kindCandidate === undefined || !SOCIAL_NOTIFICATION_KINDS.has(kindCandidate)) {

return;
    }

const keys: string[] = [];
switch (kindCandidate) {
case "friend_request": {
const incomingRequestsKey = SOCIAL_CACHE_KEYS.makeIncomingRequestsKey();
mutateCarefully(incomingRequestsKey);
keys.push(incomingRequestsKey.join("/"));
break;
      }
case "follow": {

mutateCarefully(["notifications", "unread-count"]);
keys.push("notifications/unread-count");
break;
      }
case "block": {
const blockedKey = SOCIAL_CACHE_KEYS.makeBlockedKey();
mutateCarefully(blockedKey);
keys.push(blockedKey.join("/"));
break;
      }
    }

addSocialRealtimeBreadcrumb({
eventType: NOTIFICATION_SENT,
reason: `notification-routed:${kindCandidate}`,
invalidationKeys: keys,
    });
  }, []);

useRealtimeEvent(
realtimeEnabled ? socket : null,
realtimeEnabled ? NOTIFICATION_SENT : null,
handleNotificationSent,
{ enabled: realtimeEnabled },
  );
}