'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/Sidebar';

import { useAdminNav } from '../hooks/useAdminNav';
import type { AdminNavEntry } from '../hooks/useAdminNav';

function isEntryActive(
  entry: AdminNavEntry,
  pathname: string,
  allEntries: AdminNavEntry[],
): boolean {
  if (entry.href === '/admin') {
    return pathname === '/admin';
  }
  if (pathname === entry.href) {
    return true;
  }
  if (pathname.startsWith(entry.href + '/')) {
    // If another entry is a more specific match for this pathname, this parent entry is NOT active
    const hasMoreSpecificMatch = allEntries.some(
      (other) =>
        other.href !== entry.href &&
        other.href.startsWith(entry.href) &&
        (pathname === other.href || pathname.startsWith(other.href + '/')),
    );
    return !hasMoreSpecificMatch;
  }
  return false;
}

function NavItem({
  entry,
  allEntries,
}: {
  entry: AdminNavEntry;
  allEntries: AdminNavEntry[];
}) {
  const pathname = usePathname();
  const active = isEntryActive(entry, pathname, allEntries);

  return (
    <SidebarMenuItem
      key={entry.href}
      data-testid={`admin-nav-item-${entry.href.replace(/\//g, '-')}`}
      className="min-w-0"
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
        <Link href={entry.href} className="flex items-center gap-2 min-w-0 w-full">
          {entry.icon && <entry.icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span className="text-sm font-medium truncate">{entry.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SidebarMenuItem key={i} className="min-w-0">
          <SidebarMenuButton disabled className="cursor-default opacity-60">
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-muted-foreground truncate">
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
      <SidebarMenu className="space-y-1 px-2 min-w-0">
        <NavSkeleton count={4} />
      </SidebarMenu>
    );
  }

  const allEntries = [...mainEntries, ...bottomEntries];

  return (
    <div className="flex flex-col justify-between h-full w-full min-w-0 overflow-x-hidden">
      <SidebarMenu className="space-y-1 px-2 min-w-0">
        {mainEntries.map((entry) => (
          <NavItem key={entry.href} entry={entry} allEntries={allEntries} />
        ))}
      </SidebarMenu>

      {bottomEntries.length > 0 && (
        <div className="mt-auto w-full min-w-0">
          <SidebarSeparator className="my-2" />
          <SidebarMenu className="space-y-1 px-2 pb-2 min-w-0">
            {bottomEntries.map((entry) => (
              <NavItem key={entry.href} entry={entry} allEntries={allEntries} />
            ))}
          </SidebarMenu>
        </div>
      )}
    </div>
  );
}
