/**
 * Shared design tokens for the tournament feature.
 * All status, rank, and priority colors are centralized here to prevent
 * design-system drift and enable dark-mode and theming changes in one place.
 */

import { type LucideIcon } from "lucide-react";

/* ─── Status colors ─────────────────────────────────────────────── */

export const TOURNAMENT_STATUS_TOKENS: Record<
  "upcoming" | "registration" | "ongoing" | "finished" | "cancelled",
  { label: string; variant: string }
> = {
  upcoming: {
    label: "Upcoming",
    variant:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  },
  registration: {
    label: "Registration Open",
    variant:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  },
  ongoing: {
    label: "Active",
    variant:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-200 dark:border-green-800",
  },
  finished: {
    label: "Finished",
    variant:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200 border-gray-200 dark:border-gray-800",
  },
  cancelled: {
    label: "Cancelled",
    variant:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800",
  },
};

/* ─── Registration state colors ─────────────────────────────────── */

export const REGISTRATION_STATE_TOKENS: Record<
  "success" | "neutral" | "muted",
  { badge: string; icon: string }
> = {
  success: {
    badge:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800",
    icon: "text-success dark:text-green-400",
  },
  neutral: {
    badge:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
  },
  muted: {
    badge:
      "bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border",
    icon: "text-muted-foreground",
  },
};

/* ─── Leaderboard rank colors ───────────────────────────────────── */

export const LEADERBOARD_RANK_TOKENS: Record<
  1 | 2 | 3,
  string
> = {
  1: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  2: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  3: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
};

/* ─── Capacity indicator colors ─────────────────────────────────── */

export const CAPACITY_TOKENS = {
  full: {
    icon: "text-muted-foreground",
    bar: "bg-destructive",
  },
  nearFull: {
    icon: "text-muted-foreground",
    bar: "bg-amber-500",
  },
  open: {
    icon: "text-muted-foreground",
    bar: "bg-primary",
  },
} as const;

/* ─── Header stat card accent colors ───────────────────────────── */

export const HEADER_STAT_ICONS: Record<
  | "participants"
  | "prize"
  | "host"
  | "difficulty",
  { bg: string; icon: string }
> = {
  participants: {
    bg: "bg-primary/10",
    icon: "text-primary",
  },
  prize: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: "text-amber-600 dark:text-amber-400",
  },
  host: {
    bg: "bg-secondary/10",
    icon: "text-secondary",
  },
  difficulty: {
    bg: "bg-accent",
    icon: "text-foreground",
  },
};

/* ─── Stale state colors ───────────────────────────────────────── */

export const STALE_STATE_TOKENS = {
  container:
    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  button:
    "text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40",
} as const;
