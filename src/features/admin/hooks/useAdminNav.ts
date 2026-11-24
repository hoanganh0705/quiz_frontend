"use client";

import {
  LayoutDashboard,
  BookOpen,
  Tag,
  Users,
  Settings,
  Shield,
  ScrollText,
  Trophy,
  Swords,
  BarChart3,
  MessageSquare,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  AUDIT_LOG_METADATA,
  AUDIT_LOG_ROUTE_PATH,
} from "../audit-admin/metadata";

import { useAdminRole } from "./useAdminRole";
import type { AdminPermission } from "../permissions";

export interface AdminNavEntry {
  href: string;

  label: string;

  icon?: LucideIcon;

  requiredPermissions: AdminPermission[];
}

const MAIN_ENTRIES: AdminNavEntry[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    requiredPermissions: [],
  },
  {
    href: "/admin/quizzes",
    label: "Quizzes",
    icon: Swords,
    requiredPermissions: [],
  },
  {
    href: "/admin/tournaments",
    label: "Tournaments",
    icon: Trophy,
    requiredPermissions: [
      "tournament_create",
      "tournament_update",
      "tournament_delete",
    ],
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: BookOpen,
    requiredPermissions: [
      "category_create",
      "category_update",
      "category_delete",
      "category_restore",
    ],
  },
  {
    href: "/admin/tags",
    label: "Tags",
    icon: Tag,
    requiredPermissions: [
      "tag_create",
      "tag_update",
      "tag_delete",
      "tag_restore",
    ],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    requiredPermissions: ["user_grant_role", "user_revoke_role"],
  },
  {
    href: AUDIT_LOG_ROUTE_PATH,
    label: AUDIT_LOG_METADATA.label,
    icon: AUDIT_LOG_METADATA.icon ?? ScrollText,
    requiredPermissions: [...AUDIT_LOG_METADATA.requiredPermissions],
  },
  {
    href: "/admin/rankings",
    label: "Rankings",
    icon: BarChart3,
    requiredPermissions: [
      "ranking_recalculate",
      "ranking_reset",
      "ranking_consistency_check",
    ],
  },
  {
    href: "/admin/comments/reports",
    label: "Comment Reports",
    icon: MessageSquare,
    requiredPermissions: [
      "comment_report_read",
      "comment_report_update",
      "comment_hide",
      "comment_restore",
    ],
  },
  {
    href: "/admin/reviews/reports",
    label: "Review Reports",
    icon: Star,
    requiredPermissions: ["review_report_read", "review_report_update"],
  },
];

const BOTTOM_ENTRIES: AdminNavEntry[] = [
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    requiredPermissions: [],
  },
  {
    href: "/admin/users/roles",
    label: "Roles & Permissions",
    icon: Shield,
    requiredPermissions: ["user_grant_role"],
  },
];

export interface UseAdminNavResult {
  isLoading: boolean;

  mainEntries: AdminNavEntry[];

  bottomEntries: AdminNavEntry[];
}

export function useAdminNav(): UseAdminNavResult {
  const { isLoading, permissions } = useAdminRole();

  function isVisible(entry: AdminNavEntry): boolean {
    if (entry.requiredPermissions.length === 0) return true;
    return entry.requiredPermissions.some((p) => permissions.includes(p));
  }

  return {
    isLoading,
    mainEntries: MAIN_ENTRIES.filter(isVisible),
    bottomEntries: BOTTOM_ENTRIES.filter(isVisible),
  };
}
