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

import { LayoutDashboard, BookOpen, Tag, Users, Settings, Shield, ScrollText, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { getFeatureFlagValue } from '@/lib/feature-flags';

import { AUDIT_LOG_METADATA, AUDIT_LOG_ROUTE_PATH } from '../audit-admin/metadata';

import { useAdminRole } from './useAdminRole';
import type { AdminPermission } from '../permissions';

// ─── Entry type ───────────────────────────────────────────────────────────────

export interface AdminNavEntry {
  /** Stable path for `<Link href>`. */
  href: string;
  /** User-visible label. */
  label: string;
  /** Lucide icon component. */
  icon?: LucideIcon;
  /** Permission(s) that gate this entry.  Empty = always visible when admin. */
  requiredPermissions: AdminPermission[];
  /**
   * Optional feature flag that must be `'live'` for this entry to be
   * visible.  When undefined, no feature flag is checked.
   */
  featureFlag?: 'admin_audit_live' | 'admin_ranking_live';
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
  {
    href: '/admin/users/roles',
    label: 'User Roles',
    icon: Shield,
    requiredPermissions: ['user_grant_role'],
  },
  // TKT-7.11.F1 — audit log nav entry.  Gated on `audit_log_read`
  // permission AND `admin_audit_live` feature flag.
  {
    href: AUDIT_LOG_ROUTE_PATH,
    label: AUDIT_LOG_METADATA.label,
    icon: AUDIT_LOG_METADATA.icon ?? ScrollText,
    requiredPermissions: [...AUDIT_LOG_METADATA.requiredPermissions],
    featureFlag: 'admin_audit_live',
  },
  // TKT-7.9.F2 — ranking admin nav entry. Gated on `ranking_*` permissions
  // AND `admin_ranking_live` feature flag.
  {
    href: '/admin/rankings',
    label: 'Rankings',
    icon: Trophy,
    requiredPermissions: [
      'ranking_recalculate',
      'ranking_reset',
      'ranking_consistency_check',
    ],
    featureFlag: 'admin_ranking_live',
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
 * Derive visible admin nav entries filtered by the current user's permissions
 * and feature flags.
 */
export function useAdminNav(): UseAdminNavResult {
  const { isLoading, permissions } = useAdminRole();

  // TKT-7.11.F1 — also read the audit log feature flag.  When the flag
  // is at its default value (`'placeholder'`), the audit nav entry is hidden.
  const auditFlagValue = getFeatureFlagValueSafe('admin_audit_live');

  // TKT-7.9.F2 — read the ranking admin feature flag.  When the flag
  // is at its default value (`'placeholder'`), the rankings nav entry is hidden.
  const rankingFlagValue = getFeatureFlagValueSafe('admin_ranking_live');

  function isVisible(entry: AdminNavEntry): boolean {
    if (entry.featureFlag && entry.featureFlag === 'admin_audit_live') {
      if (auditFlagValue !== 'live') return false;
    }
    if (entry.featureFlag && entry.featureFlag === 'admin_ranking_live') {
      if (rankingFlagValue !== 'live') return false;
    }
    if (entry.requiredPermissions.length === 0) return true;
    return entry.requiredPermissions.some((p) => permissions.includes(p));
  }

  return {
    isLoading,
    mainEntries: MAIN_ENTRIES.filter(isVisible),
    bottomEntries: BOTTOM_ENTRIES.filter(isVisible),
  };
}

// ─── Internal helper ────────────────────────────────────────────────────────

/**
 * Read the audit log feature flag value.  Returns `'placeholder'`
 * when the flag is at its default — defensive against the flag
 * being added or removed across deploys.
 */
function getFeatureFlagValueSafe(
  flag: 'admin_audit_live' | 'admin_ranking_live',
): 'live' | 'placeholder' {
  const value = getFeatureFlagValue(flag);
  return value === 'live' ? 'live' : 'placeholder';
}
