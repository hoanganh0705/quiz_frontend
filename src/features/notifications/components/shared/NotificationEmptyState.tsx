"use client";

/**
 * `NotificationEmptyState.tsx` — empty-state block for notification surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.C1.
 *
 * Provides a reusable empty-state component with three variants:
 *   - `'all'`         — no notifications at all
 *   - `'unread'`      — no unread notifications (everything has been read)
 *   - `'preferences'` — preferences view with disabled-channels hint
 *
 * Each variant adjusts the icon, title, body, and action affordances.
 *
 * No service, hook, or socket client is imported by this primitive.
 */

import { Bell, BellOff, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export type NotificationEmptyStateVariant =
  | "all"
  | "unread"
  | "preferences";

interface NotificationEmptyStateProps {
  variant?: NotificationEmptyStateVariant;
  className?: string;
}

const VARIANT_CONFIG: Record<
  NotificationEmptyStateVariant,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    actions: ReadonlyArray<{
      label: string;
      href?: string;
      onClick?: () => void;
      variant?: "default" | "outline";
      icon?: LucideIcon;
    }>;
    size: "sm" | "md" | "lg";
  }
> = {
  all: {
    icon: Bell,
    title: "No notifications",
    description:
      "You're all caught up! New notifications will appear here when you have quiz updates, friend requests, or achievements.",
    size: "md",
    actions: [
      { label: "Explore Quizzes", href: "/quizzes", variant: "default" },
      {
        label: "Notification Settings",
        href: "/settings/notifications",
        variant: "outline",
        icon: Settings,
      },
    ],
  },
  unread: {
    icon: Bell,
    title: "No unread notifications",
    description:
      "You've read all your notifications. Check back later for new updates!",
    size: "sm",
    actions: [],
  },
  preferences: {
    icon: BellOff,
    title: "Notifications disabled",
    description:
      "Enable notifications to stay updated on quiz invites, friend requests, achievements, and more.",
    size: "md",
    actions: [
      {
        label: "Notification Settings",
        href: "/settings/notifications",
        variant: "default",
        icon: Settings,
      },
    ],
  },
};

export function NotificationEmptyState({
  variant = "all",
  className,
}: NotificationEmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      actions={config.actions as Parameters<typeof EmptyState>[0]["actions"]}
      size={config.size}
      className={className}
      data-testid="notification-empty-state"
    />
  );
}
