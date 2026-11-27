"use client";

import { useNotificationEventRouter } from "@/features/social/hooks/useNotificationEventRouter";

export function BadgeSyncLayer(): null {
  useNotificationEventRouter();

  return null;
}
