import {
  __resetBroadcastAvailabilityForTest,
  createBroadcastChannel,
} from "@/lib/broadcast";

import { invalidateAchievementAdmin } from "./cache-keys";

export const ACHIEVEMENT_ADMIN_CHANNEL_NAME = "admin-achievement" as const;

export type AchievementAdminEventType =
  "admin:7.1.achievement-admin.invalidate";

export type AchievementAdminMutation = "reevaluate" | "revoke";

const VALID_MUTATIONS = new Set<AchievementAdminMutation>([
  "reevaluate",
  "revoke",
]);

export interface BaseAchievementAdminEvent {
  type: AchievementAdminEventType;
  tabId: string;
  timestamp: number;
  action: AchievementAdminMutation;
  userId: string;
  badgeId?: string;
  requestId: string;
}

export interface AchievementAdminInvalidatedEvent
  extends BaseAchievementAdminEvent {
  type: "admin:7.1.achievement-admin.invalidate";
}

export type AchievementAdminEvent = AchievementAdminInvalidatedEvent;

const achievementAdminChannel = createBroadcastChannel<AchievementAdminEvent>(
  ACHIEVEMENT_ADMIN_CHANNEL_NAME,
  {
    validate: (data): AchievementAdminEvent | null => {
      if (typeof data !== "object" || data === null) return null;
      const d = data as Partial<BaseAchievementAdminEvent>;
      if (d.type !== "admin:7.1.achievement-admin.invalidate") return null;
      if (typeof d.tabId !== "string" || d.tabId.length === 0) return null;
      if (
        typeof d.action !== "string" ||
        !VALID_MUTATIONS.has(d.action as AchievementAdminMutation)
      ) {
        return null;
      }
      if (typeof d.userId !== "string" || d.userId.length === 0) return null;
      return d as AchievementAdminEvent;
    },
  },
);

export function closeAchievementAdminChannel(): void {
  achievementAdminChannel.closeChannel();
}

export function resetAchievementAdminBroadcastChannelAvailability(): void {
  __resetBroadcastAvailabilityForTest();
}

export function subscribeAchievementAdminInvalidate(
  handler: (event: AchievementAdminEvent) => void,
): () => void {
  return achievementAdminChannel.subscribe(handler);
}

export function broadcastAchievementAdminMutation(payload: {
  action: AchievementAdminMutation;
  userId: string;
  badgeId?: string;
  requestId: string;
}): void {
  if (!payload.userId || typeof payload.userId !== "string") {
    return;
  }
  achievementAdminChannel.publish({
    type: "admin:7.1.achievement-admin.invalidate",
    action: payload.action,
    userId: payload.userId,
    badgeId: payload.badgeId,
    requestId: payload.requestId,
  });
}

export function handleAchievementAdminInvalidation(
  event: AchievementAdminEvent,
): void {
  void invalidateAchievementAdmin(event.userId);
}
