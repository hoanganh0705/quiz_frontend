

"use client";

import { useNotificationEventRouter } from "@/features/social/hooks/useNotificationEventRouter";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export function BadgeSyncLayer(): null {

const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
if (flagValue === "placeholder") {
return null;
  }

useNotificationEventRouter();

return null;
}