'use client';

/**
 * `features/admin/components/AdminNav.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.C2.
 *
 * ## Purpose
 *
 * Renders the permission-filtered admin sidebar navigation.  Uses
 * `useAdminNav` to derive which entries the current admin may see, and
 * highlights the active route via `usePathname`.
 *
 * ## Loading semantics
 *
 * When `useAdminNav().isLoading` is `true`, the nav renders a skeleton
 * matching the nav-item shape (one skeleton row per section).  No guessed
 * entries are shown while loading.  When the guard is active the outer
 * `AdminRoleGuard` skeleton fires first; when the guard is bypassed for
 * standalone use this component handles its own pending state.
 *
 * ## Invariants
 *
 * - Every entry maps to one or more `AdminPermission` values (documented in
 *   `useAdminNav`).
 * - No `user.role` string comparison appears here.
 * - Admin bookmark operations do not appear in the nav catalogue.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/Sidebar';

import { useAdminNav } from '../hooks/useAdminNav';
import type { AdminNavEntry } from '../hooks/useAdminNav';

function isActive(entry: AdminNavEntry, pathname: string): boolean {
  if (entry.href === '/admin') return pathname === '/admin';
  return pathname.startsWith(entry.href);
}

function NavItem({ entry }: { entry: AdminNavEntry }) {
  const pathname = usePathname();
  const active = isActive(entry, pathname);

  return (
    <SidebarMenuItem
      key={entry.href}
      data-testid={`admin-nav-item-${entry.href.replace(/\//g, '-')}`}
    >
      <SidebarMenuButton
        asChild
        isActive={active}
        className={
          active
            ? 'text-white-primary bg-brand hover:bg-brand-hover data-[active=true]:bg-brand-hover'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }
      >
        <Link href={entry.href}>
          {entry.icon && <entry.icon className="h-4 w-4" aria-hidden="true" />}
          <span className="text-sm font-medium">{entry.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SidebarMenuItem key={i}>
          <SidebarMenuButton
            disabled
            className="cursor-default opacity-60"
          >
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-muted-foreground">
              Loading…
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}

export function AdminNav() {
  const { isLoading, mainEntries, bottomEntries } = useAdminNav();

  if (isLoading) {
    return (
      <SidebarMenu className="space-y-1 px-2">
        <NavSkeleton count={4} />
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu className="space-y-1 px-2">
        {mainEntries.map((entry) => (
          <NavItem key={entry.href} entry={entry} />
        ))}
      </SidebarMenu>
      <SidebarMenu className="space-y-1 px-2 pb-2">
        {bottomEntries.map((entry) => (
          <NavItem key={entry.href} entry={entry} />
        ))}
      </SidebarMenu>
    </>
  );
}
