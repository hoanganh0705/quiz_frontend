import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  Shield,
  Star,
  Swords,
  Tag,
  Trophy,
  Users,
} from "lucide-react";

import {
  AUDIT_LOG_METADATA,
  AUDIT_LOG_ROUTE_PATH,
} from "../audit-admin/metadata";

import type { AdminPermission } from "../permissions";
import type { LucideIcon } from "lucide-react";

export interface AdminNavEntry {
  href: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  requiredPermissions: AdminPermission[];
  quickActionLabel?: string;
}

export const ADMIN_MAIN_NAV_ENTRIES: readonly AdminNavEntry[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    requiredPermissions: [],
  },
  {
    href: "/admin/quizzes",
    label: "Quizzes",
    quickActionLabel: "Manage Quizzes",
    description: "Review and moderate quizzes",
    icon: Swords,
    requiredPermissions: [],
  },
  {
    href: "/admin/tournaments",
    label: "Tournaments",
    quickActionLabel: "Manage Tournaments",
    description: "Configure competitive tournaments",
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
    quickActionLabel: "Manage Categories",
    description: "Add, edit, or remove categories",
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
    quickActionLabel: "Manage Tags",
    description: "Organize quiz tags",
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
    quickActionLabel: "Manage Users",
    description: "User accounts and permissions",
    icon: Users,
    requiredPermissions: ["user_grant_role", "user_revoke_role"],
  },
  {
    href: AUDIT_LOG_ROUTE_PATH,
    label: AUDIT_LOG_METADATA.label,
    quickActionLabel: "Audit Log",
    description: "Live administrative actions and events",
    icon: AUDIT_LOG_METADATA.icon ?? ScrollText,
    requiredPermissions: [...AUDIT_LOG_METADATA.requiredPermissions],
  },
  {
    href: "/admin/rankings",
    label: "Rankings",
    description: "Recalculate and audit leaderboard rankings",
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
    quickActionLabel: "Comment Reports",
    description: "Moderation queue for comments",
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
    quickActionLabel: "Review Reports",
    description: "Flagged quiz reviews and ratings",
    icon: Star,
    requiredPermissions: ["review_report_read", "review_report_update"],
  },
];

export const ADMIN_BOTTOM_NAV_ENTRIES: readonly AdminNavEntry[] = [
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

export const ADMIN_DASHBOARD_QUICK_LINKS: readonly (AdminNavEntry & {
  icon: LucideIcon;
  description: string;
})[] = ADMIN_MAIN_NAV_ENTRIES.filter(
  (
    entry,
  ): entry is AdminNavEntry & { icon: LucideIcon; description: string } =>
    Boolean(entry.quickActionLabel && entry.icon && entry.description),
);

export const ADMIN_ROUTE_LABELS: Readonly<Record<string, string>> =
  Object.freeze({
    admin: "Admin",
    quizzes: "Quizzes",
    categories: "Categories",
    tags: "Tags",
    users: "Users",
    roles: "User Roles",
    badges: "Badges",
    achievements: "Achievements",
    tournaments: "Tournaments",
    comments: "Comments",
    reviews: "Reviews",
    reports: "Reports",
    rankings: "Rankings",
    audit: "Audit log",
    settings: "Settings",
    "review-moderation": "Review moderation",
  });

const NON_ROUTABLE_ADMIN_PATHS: readonly RegExp[] = [
  /^\/admin\/comments$/,
  /^\/admin\/reviews$/,
  /^\/admin\/achievements$/,
  /^\/admin\/achievements\/users$/,
];

export function isRoutableAdminBreadcrumbPath(href: string): boolean {
  return !NON_ROUTABLE_ADMIN_PATHS.some((pattern) => pattern.test(href));
}
