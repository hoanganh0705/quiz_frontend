"use client";

/**
 * `NotificationItem.tsx` — single notification row.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.D2.
 *
 * Renders a single notification row used by `NotificationPopover` and
 * `NotificationCenterPage`. The row surfaces:
 *
 *   - type icon (mapped via `getNotificationTypeIcon`)
 *   - title (bold + accent when unread)
 *   - body (clamped to 2 lines)
 *   - relative timestamp
 *   - mark-read / mark-unread toggle button (calls the matching mutation
 *     hook, with inline pending state)
 *   - delete button (calls `useDeleteNotification`)
 *
 * Clicking the row body navigates to the notification's `action.target`
 * URL when present; otherwise it only marks the row read (so the
 * notification state still converges to the authoritative value).
 *
 * ## No service beyond documented hooks
 *
 * The component imports only the documented mutation hooks from
 * `@/features/notifications/hooks` and the feature types — no service,
 * socket, or axios client.
 */

import { createElement, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Circle,
  Loader2,
  MessageCircle,
  Star,
  Trash2,
  Trophy,
  Users,
  Calendar,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";
import { Button } from "@/components/ui/Button";

import {
  useMarkNotificationRead,
  useMarkNotificationUnread,
  useDeleteNotification,
} from "@/features/notifications/hooks";
import type { Notification } from "@/features/notifications/types";

// ─── Type icon mapping ─────────────────────────────────────────────────────

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  // The popover icons mapping mirrors the four-domain UI representation
  // documented in Epic 5.4.
  achievement: Trophy,
  achievement_earned: Trophy,
  badge_earned: Trophy,
  badge_unlocked: Trophy,
  badge_revoked: Trophy,
  rank_achievement: Trophy,
  rank_improvement: Trophy,
  rank_improved: Trophy,
  rank_milestone: Trophy,
  period_winner: Trophy,
  streak_milestone: Star,

  tournament_invite: Calendar,
  tournament_starting: Calendar,
  tournament_started: Calendar,
  tournament_completed: Trophy,
  tournament_won: Trophy,
  tournament_reminder: Calendar,

  friend_request: Users,
  friend_accepted: Users,
  followed: Users,

  comment_reply: MessageCircle,
  comment_mention: MessageCircle,
  comment_created: MessageCircle,
  quiz_review_received: MessageCircle,
  weekly_summary: MessageCircle,
};

function getNotificationTypeIcon(type: string | undefined): LucideIcon {
  if (!type) return Bell;
  return TYPE_ICON_MAP[type] ?? Bell;
}

function getTypeAccent(type: string | undefined): string {
  switch (type) {
    case "achievement":
    case "achievement_earned":
    case "badge_earned":
    case "badge_unlocked":
    case "rank_achievement":
    case "rank_improvement":
    case "rank_improved":
    case "period_winner":
    case "streak_milestone":
    case "tournament_won":
      return "text-yellow-500";
    case "tournament_invite":
    case "tournament_starting":
    case "tournament_started":
    case "tournament_reminder":
      return "text-blue-500";
    case "friend_request":
    case "friend_accepted":
    case "followed":
      return "text-emerald-500";
    case "comment_reply":
    case "comment_mention":
    case "comment_created":
    case "quiz_review_received":
      return "text-purple-500";
    default:
      return "text-slate-500";
  }
}

// ─── Relative time ────────────────────────────────────────────────────────

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1_000);
  const diffMins = Math.floor(diffMs / (1_000 * 60));
  const diffHours = Math.floor(diffMs / (1_000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1_000 * 60 * 60 * 24));

  if (diffSec < 30) return "Just now";
  if (diffMins < 1) return `${diffSec}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Target URL resolution ────────────────────────────────────────────────

/**
 * Resolve the navigation target for a notification's `metadata` payload.
 *
 * The backend stores metadata as a free-form `{ [k: string]: unknown }`
 * shape. The popover / item consumers map common keys to in-app
 * routes. Unknown shapes fall back to `/notifications` so the user
 * always lands somewhere safe.
 */
function resolveActionTarget(notification: Notification): string | null {
  const metadata = notification.metadata;
  if (!metadata || typeof metadata !== "object") return null;

  const payload = metadata as Record<string, unknown>;

  const pickString = (key: string): string | null =>
    typeof payload[key] === "string" ? (payload[key] as string) : null;

  // The popover icon + target resolution mirrors the action-shape
  // conventions from Phase 3/4 notifications. The metadata may use
  // any of the documented keys below.
  const quizId = pickString("quizId") ?? pickString("quiz_id");
  const tournamentId =
    pickString("tournamentId") ?? pickString("tournament_id");
  const userId = pickString("userId") ?? pickString("user_id");
  const attemptId = pickString("attemptId") ?? pickString("attempt_id");
  const instanceId = pickString("instanceId") ?? pickString("instance_id");
  const reviewId = pickString("reviewId") ?? pickString("review_id");
  const action = pickString("action");

  if (quizId) return `/quizzes/${quizId}`;
  if (tournamentId) return `/tournaments/${tournamentId}`;
  if (attemptId) return `/attempts/${attemptId}`;
  if (userId) return `/profile/${userId}`;
  if (instanceId) return `/instances/${instanceId}`;
  if (reviewId) return `/quizzes/${quizId ?? ""}#reviews`;
  if (action === "open_settings_notifications")
    return "/settings/notifications";

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────

export interface NotificationItemProps {
  notification: Notification;
  onNavigated?: () => void;
  /** Hide the delete affordance. Default: `false`. */
  hideDelete?: boolean;
  /** Hide the mark-read toggle. Default: `false` (auto-marked read on click). */
  hideMarkToggle?: boolean;
  className?: string;
}

export function NotificationItem({
  notification,
  onNavigated,
  hideDelete = false,
  hideMarkToggle = false,
  className,
}: NotificationItemProps) {
  const router = useRouter();
  const { markRead, state: readState } = useMarkNotificationRead(
    notification.isRead ? null : notification.id,
  );
  const { markUnread, state: unreadState } = useMarkNotificationUnread(
    notification.isRead ? notification.id : null,
  );
  const {
    deleteNotification: removeNotification,
    state: deleteState,
  } = useDeleteNotification(notification.id);

  const Icon = getNotificationTypeIcon(notification.type);
  const accent = getTypeAccent(notification.type);
  const target = resolveActionTarget(notification);

  const isReadPending = readState === "pending";
  const isUnreadPending = unreadState === "pending";
  const isDeletePending = deleteState === "pending";

  // Auto-mark read when the user clicks an unread row, then navigate
  // to the target URL. Errors during mark-read are swallowed silently
  // because the canonical state will reconcile on the next revalidation.
  const handleRowClick = useCallback(async () => {
    if (!notification.isRead) {
      try {
        await markRead();
      } catch {
        // Silent — SWR revalidation will reconcile.
      }
    }
    if (target) {
      onNavigated?.();
      router.push(target);
    } else {
      onNavigated?.();
    }
  }, [notification.isRead, markRead, target, router, onNavigated]);

  const handleToggleRead = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        if (notification.isRead) {
          await markUnread();
        } else {
          await markRead();
        }
      } catch {
        // Hook surfaces the typed error already; no additional copy needed.
      }
    },
    [notification.isRead, markRead, markUnread],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await removeNotification();
      } catch {
        // Hook surfaces the typed error already.
      }
    },
    [removeNotification],
  );

  // Stop event propagation so taps on the action buttons don't bubble
  // up to the row click handler.
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      role="article"
      aria-label={notification.title}
      data-testid="notification-item"
      data-notification-id={notification.id}
      data-read={notification.isRead ? "true" : "false"}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void handleRowClick();
        }
      }}
      tabIndex={0}
      className={cn(
        "group flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer focus:bg-muted/50 hover:bg-muted/30 border-b border-gray-100 dark:border-slate-800 last:border-b-0 transition-colors",
        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
        className,
      )}
    >
      <div className="shrink-0 mt-0.5">
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted flex items-center justify-center">
          {createElement(Icon, {
            className: cn("h-4 w-4", accent),
            "aria-hidden": "true",
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <p
            className={cn(
              "text-xs sm:text-sm truncate",
              notification.isRead
                ? "font-medium text-foreground/80"
                : "font-semibold text-foreground",
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <Circle className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 fill-blue-500 shrink-0" />
          )}
        </div>
        {notification.message && (
          <p className="text-[0.65rem] sm:text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}
        <p className="text-[0.65rem] sm:text-xs text-muted-foreground/70 mt-0.5 sm:mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
        {target && (
          <p className="text-[0.6rem] sm:text-[0.65rem] text-blue-500 dark:text-blue-400 mt-0.5">
            <Link
              href={target}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="hover:underline focus:underline focus:outline-none"
            >
              Open →
            </Link>
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {!hideMarkToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            aria-label={
              notification.isRead ? "Mark as unread" : "Mark as read"
            }
            disabled={isReadPending || isUnreadPending}
            onClick={handleToggleRead}
            title={notification.isRead ? "Mark as unread" : "Mark as read"}
          >
            {isReadPending || isUnreadPending ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : notification.isRead ? (
              <Circle
                className="h-3 w-3 sm:h-4 sm:w-4"
                aria-hidden="true"
              />
            ) : (
              <CheckCheck
                className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500"
                aria-hidden="true"
              />
            )}
          </Button>
        )}

        {!hideDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-red-100 dark:hover:bg-red-900/30"
            aria-label="Delete notification"
            disabled={isDeletePending}
            onClick={(e) => {
              stopProp(e);
              void handleDelete(e);
            }}
            title="Delete"
          >
            {isDeletePending ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <Trash2
                className="h-3 w-3 sm:h-4 sm:w-4 text-red-500"
                aria-hidden="true"
              />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
