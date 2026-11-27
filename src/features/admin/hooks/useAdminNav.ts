"use client";

import {
  ADMIN_BOTTOM_NAV_ENTRIES,
  ADMIN_MAIN_NAV_ENTRIES,
} from "../config/admin-nav-registry";
import { useAdminRole } from "./useAdminRole";

import type { AdminNavEntry } from "../config/admin-nav-registry";

export type { AdminNavEntry };

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
    mainEntries: ADMIN_MAIN_NAV_ENTRIES.filter(isVisible),
    bottomEntries: ADMIN_BOTTOM_NAV_ENTRIES.filter(isVisible),
  };
}
