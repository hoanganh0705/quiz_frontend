"use client";

import { useEffect, useRef } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { useRealtimeEvent } from "@/lib/realtime/useRealtimeEvent";
import {
  NOTIFICATIONS_NAMESPACE,
  NOTIFICATION_SENT,
  useSocket,
  emitRealtimeCrossTabInvalidation,
} from "@/lib/realtime";
import type { UseSocketReturn } from "@/lib/realtime";
import type { NotificationSentPayload } from "@/lib/realtime/events";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { makeAchievementInvalidationKeys } from "@/features/achievements/types";

const ACHIEVEMENT_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  "achievement",
  "ACHIEVEMENT",
  "Achievement",
]);

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export function useAchievementNotificationRevalidation(): void {
  const achievementsFlag = getFeatureFlagValue("achievements_live");
  const notificationsFlag = getFeatureFlagValue("notifications_live");
  const realtimeFlag = getFeatureFlagValue("realtime_infrastructure_live");

  const achievementsPlaceholder = achievementsFlag === "placeholder";
  const notificationsPlaceholder = notificationsFlag === "placeholder";
  const realtimePlaceholder = realtimeFlag === "placeholder";

  const enabled =
    !achievementsPlaceholder &&
    !notificationsPlaceholder &&
    !realtimePlaceholder;

  const { socket, connectionState }: UseSocketReturn = useSocket(
    NOTIFICATIONS_NAMESPACE,
    { autoConnect: enabled, enabled },
  );

  const seenIdsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      const cutoff = Date.now() - DEDUPE_WINDOW_MS;
      const map = seenIdsRef.current;
      for (const [id, ts] of map) {
        if (ts < cutoff) {
          map.delete(id);
        }
      }
    }, DEDUPE_WINDOW_MS);
    return () => {
      window.clearInterval(interval);
    };
  }, [enabled]);

  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? NOTIFICATION_SENT : null,
    (rawPayload) => {
      const payload = rawPayload as NotificationSentPayload | undefined;
      if (!payload || typeof payload !== "object") return;
      const isAchievement = ACHIEVEMENT_NOTIFICATION_TYPES.has(payload.type);
      if (!isAchievement) return;

      const id = payload.notificationId;
      if (typeof id !== "string" || id.length === 0) return;

      const seenAt = seenIdsRef.current.get(id);
      if (
        typeof seenAt === "number" &&
        seenAt > Date.now() - DEDUPE_WINDOW_MS
      ) {
        return;
      }
      seenIdsRef.current.set(id, Date.now());

      const keys = makeAchievementInvalidationKeys();

      try {
        const queryClient = getQueryClient();
        void queryClient.invalidateQueries({ queryKey: keys.catalog });
        void queryClient.invalidateQueries({ queryKey: keys.myBadges });
        void queryClient.invalidateQueries({ queryKey: keys.history });
      } catch {
        // Fail-open
      }

      const dataRecord =
        typeof payload.data === "object" && payload.data !== null
          ? (payload.data as Record<string, unknown>)
          : null;
      const badgeId =
        dataRecord && typeof dataRecord.badgeId === "string"
          ? dataRecord.badgeId
          : null;
      if (badgeId) {
        try {
          const queryClient = getQueryClient();
          void queryClient.invalidateQueries({
            queryKey: keys.detail(badgeId),
          });
        } catch {
          // Fail-open
        }
        emitRealtimeCrossTabInvalidation({
          type: "achievement",
          badgeId,
        } as never);
      } else {
        emitRealtimeCrossTabInvalidation({ type: "achievement" } as never);
      }
    },
    { enabled: enabled && connectionState === "connected" },
  );
}
