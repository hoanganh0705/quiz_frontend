'use client';

/**
 * `features/admin/hooks/useAdminNav.ts`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.C2.
 *
 * ## Purpose
 *
 * Derives the visible admin sidebar navigation entries from `useAdminRole`
 * and the `PERMISSIONS` map.  Each entry is backed by a typed
 * `AdminPermission`, so the sidebar shows only the controls the current
 * admin is actually authorised to use.
 *
 * ## Design
 *
 * - **Permission-derived**: every nav section maps to one or more
 *   `AdminPermission` values.  An entry is included only when
 *   `hasPermission === true`.
 * - **Loading-safe**: when `useAdminRole` is still loading, `isLoading` is
 *   `true` and the entries array is empty (the `AdminRoleGuard` skeleton
 *   handles the pending state).
 * - **No `user.role` checks**: the hook reads only the normalised
 *   `permissions[]` array from `useAdminRole`.
 *
 * ## Nav entry taxonomy
 *
 * | Entry | Permission(s) | Section |
 * |-------|----------------|---------|
 * | Dashboard | none (always visible when admin) | main |
 * | Categories | `category_*` | main |
 * | Tags | `tag_*` | main |
 * | Users | `user_grant_role` or `user_revoke_role` | main |
 * | Settings | none (always visible when admin) | bottom |
 * | Roles & Permissions | `user_grant_role` | bottom |
 */

import type { Icon } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  Tag,
  Users,
  Settings,
  Shield,
} from 'lucide-react';

import { useAdminRole } from './useAdminRole';
import type { AdminPermission } from '../permissions';

// ─── Entry type ───────────────────────────────────────────────────────────────

export interface AdminNavEntry {
  /** Stable path for `<Link href>`. */
  href: string;
  /** User-visible label. */
  label: string;
  /** Lucide icon component. */
  icon?: Icon;
  /** Permission(s) that gate this entry.  Empty = always visible when admin. */
  requiredPermissions: AdminPermission[];
}

// ─── Nav catalogue ───────────────────────────────────────────────────────────

const MAIN_ENTRIES: AdminNavEntry[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    requiredPermissions: [],
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    icon: BookOpen,
    requiredPermissions: [
      'category_create',
      'category_update',
      'category_delete',
      'category_restore',
    ],
  },
  {
    href: '/admin/tags',
    label: 'Tags',
    icon: Tag,
    requiredPermissions: [
      'tag_create',
      'tag_update',
      'tag_delete',
      'tag_restore',
    ],
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
    requiredPermissions: ['user_grant_role', 'user_revoke_role'],
  },
];

const BOTTOM_ENTRIES: AdminNavEntry[] = [
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    requiredPermissions: [],
  },
  {
    href: '/admin/roles',
    label: 'Roles & Permissions',
    icon: Shield,
    requiredPermissions: ['user_grant_role'],
  },
];

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseAdminNavResult {
  /** `true` while `useAdminRole` is resolving. */
  isLoading: boolean;
  /** Entries for the main sidebar section. */
  mainEntries: AdminNavEntry[];
  /** Entries for the bottom / footer sidebar section. */
  bottomEntries: AdminNavEntry[];
}

/**
 * Derive visible admin nav entries filtered by the current user's permissions.
 */
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
