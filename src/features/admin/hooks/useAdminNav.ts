'use client';

import { LayoutDashboard, BookOpen, Tag, Users, Settings, Shield, ScrollText, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { getFeatureFlagValue } from '@/lib/feature-flags';

import { AUDIT_LOG_METADATA, AUDIT_LOG_ROUTE_PATH } from '../audit-admin/metadata';

import { useAdminRole } from './useAdminRole';
import type { AdminPermission } from '../permissions';

export interface AdminNavEntry {

href: string;

label: string;

icon?: LucideIcon;

requiredPermissions: AdminPermission[];

featureFlag?: 'admin_audit_live' | 'admin_ranking_live';
}

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

{
href: AUDIT_LOG_ROUTE_PATH,
label: AUDIT_LOG_METADATA.label,
icon: AUDIT_LOG_METADATA.icon ?? ScrollText,
requiredPermissions: [...AUDIT_LOG_METADATA.requiredPermissions],
featureFlag: 'admin_audit_live',
  },

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

export interface UseAdminNavResult {

isLoading: boolean;

mainEntries: AdminNavEntry[];

bottomEntries: AdminNavEntry[];
}

export function useAdminNav(): UseAdminNavResult {
const { isLoading, permissions } = useAdminRole();

const auditFlagValue = getFeatureFlagValueSafe('admin_audit_live');

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

function getFeatureFlagValueSafe(
flag: 'admin_audit_live' | 'admin_ranking_live',
): 'live' | 'placeholder' {
const value = getFeatureFlagValue(flag);
return value === 'live' ? 'live' : 'placeholder';
}
