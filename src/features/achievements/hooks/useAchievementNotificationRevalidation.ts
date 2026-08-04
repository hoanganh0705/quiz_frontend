"use client";

/**
 * `useAchievementNotificationRevalidation` — notification-driven
 * revalidation bridge for the achievement SWR cache.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.C2.
 *
 * ## What this hook owns
 *
 * Wire the achievement SWR cache to the `/notifications` Socket.IO
 * namespace so that a `notification:sent` event of type
 * `'achievement'` triggers revalidation of:
 *
 *   1. The badge catalog (`ACHIEVEMENT_CACHE_KEYS.catalog()`).
 *   2. The authenticated user's earned-badges list
 *      (`ACHIEVEMENT_CACHE_KEYS.myBadges()`).
 *   3. The achievement history list
 *      (`ACHIEVEMENT_CACHE_KEYS.history()`).
 *   4. The affected badge detail key (`ACHIEVEMENT_CACHE_KEYS.detail(code)`).
 *
 * The bridge deduplicates by notification `id` using the same dedupe
 * convention established in Story 5.4 (an in-memory `Set` cleared
 * every 10 minutes to bound memory growth).
 *
 * On every deduplicated achievement notification, the hook also
 * emits a `phase5/invalidation` cross-tab invalidation so sibling tabs
 * refetch without opening their own socket.
 *
 * ## Feature flag preconditions
 *
 * The hook is a no-op when:
 *
 *   - `phase5_achievements === 'placeholder'`.
 *   - `phase5_notifications === 'placeholder'`.
 *   - `phase5_realtime_infrastructure === 'placeholder'` (the socket
 *     cannot open without the foundational realtime layer).
 *
 * The mount point must be inside `<AuthBootstrapProvider>` (the
 * socket itself requires an authenticated handshake).
 *
 * ## Loop prevention
 *
 * The `phase5/invalidation` broadcast uses `getCurrentTabId()` for
 * same-tab filtering (see `phase5-broadcast.ts`). When the receiving
 * tab mutates the cache, it does NOT re-broadcast — there is no
 * outbound cross-tab emit in the broadcast handler.
 *
 * ## Usage
 *
 * Mount once at the application shell, adjacent to the
 * `useNotificationSocket` call:
 *
 * ```tsx
 * function RouteShell() {
 *   useNotificationSocket();
 *   useAchievementNotificationRevalidation();
 *   return <Outlet />;
 * }
 * ```
 */

import { useEffect, useRef } from "react";
import { mutate as globalMutate } from "swr";

import { useRealtimeEvent } from "@/lib/realtime/useRealtimeEvent";
import {
  NOTIFICATIONS_NAMESPACE,
  NOTIFICATION_SENT,
  useSocket,
  emitPhase5Invalidation,
} from "@/lib/realtime";
import type { UseSocketReturn } from "@/lib/realtime";
import type { NotificationSentPayload } from "@/lib/realtime/events";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { makeAchievementInvalidationKeys } from "@/features/achievements/types";

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * Notification types that should trigger achievement revalidation.
 *
 * The backend emits `'achievement'` for badge-earned events. We
 * accept any case-insensitive variant to be lenient toward future
 * server-side additions (`'ACHIEVEMENT'`, `'Achievement'`).
 */
const ACHIEVEMENT_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  "achievement",
  "ACHIEVEMENT",
  "Achievement",
]);

/**
 * Time window (ms) during which duplicate notification IDs are
 * discarded. After the window expires the id is forgotten so the
 * same notification can re-trigger if the user navigates back to the
 * page after a long absence.
 */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Subscribe to achievement-typed notification events and revalidate the
 * matching SWR cache keys.
 *
 * The hook is side-effect-only: it returns `void`. Mount it once at
 * the application shell.
 */
export function useAchievementNotificationRevalidation(): void {
  const achievementsFlag = getFeatureFlagValue("phase5_achievements");
  const notificationsFlag = getFeatureFlagValue("phase5_notifications");
  const realtimeFlag = getFeatureFlagValue("phase5_realtime_infrastructure");

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

  // Dedupe set: notification IDs the current tab has already
  // processed within the last `DEDUPE_WINDOW_MS` ms.
  const seenIdsRef = useRef<Map<string, number>>(new Map());

  // Periodic GC: forget dedupe entries older than the window.
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

  // ─── Local invalidation handler ──────────────────────────────────────
  //
  // Triggered by every notification:sent event whose type matches the
  // achievement set. Dedupes by notification id, mutates the four
  // SWR keys, and emits a cross-tab invalidation.

  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? NOTIFICATION_SENT : null,
    (rawPayload) => {
      const payload = rawPayload as NotificationSentPayload | undefined;
      if (!payload || typeof payload !== "object") return;
      const isAchievement = ACHIEVEMENT_NOTIFICATION_TYPES.has(
        payload.type,
      );
      if (!isAchievement) return;

      const id = payload.notificationId;
      if (typeof id !== "string" || id.length === 0) return;

      // Dedupe: skip if we've processed this id within the window.
      const seenAt = seenIdsRef.current.get(id);
      if (typeof seenAt === "number" && seenAt > Date.now() - DEDUPE_WINDOW_MS) {
        return;
      }
      seenIdsRef.current.set(id, Date.now());

      // Revalidate the four achievement SWR keys.
      const keys = makeAchievementInvalidationKeys();
      void globalMutate(keys.catalog, undefined, { revalidate: true });
      void globalMutate(keys.myBadges, undefined, { revalidate: true });
      void globalMutate(keys.history, undefined, { revalidate: true });
      // Best-effort: invalidate the affected badge detail when the
      // payload carries a badgeId in the `data` extension.
      const dataRecord =
        typeof payload.data === "object" && payload.data !== null
          ? (payload.data as Record<string, unknown>)
          : null;
      const badgeId =
        dataRecord && typeof dataRecord.badgeId === "string"
          ? dataRecord.badgeId
          : null;
      if (badgeId) {
        void globalMutate(keys.detail(badgeId), undefined, {
          revalidate: true,
        });
        emitPhase5Invalidation(
          { type: "achievement", badgeId } as never,
        );
      } else {
        emitPhase5Invalidation({ type: "achievement" } as never);
      }
    },
    { enabled: enabled && connectionState === "connected" },
  );
}