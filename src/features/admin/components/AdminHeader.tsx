"use client";

import Link from "next/link";

import { Bell, LogOut } from "lucide-react";

import { AdminBreadcrumb } from "@/features/admin/components/AdminBreadcrumb";
import { useAdminRole } from "@/features/admin/hooks/useAdminRole";
import { useLogout } from "@/features/auth/hooks/use-logout";

import { Button } from "@/components/ui/Button";
import { SidebarTrigger } from "@/components/ui/Sidebar";

import { ModeToggle } from "@/shared/layout/components/ModeToggle";

function formatRoleBadge(role: string | null): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "moderator") return "Moderator";
  if (role === "admin") return "Admin";
  return "Staff";
}

export function AdminHeader() {
  const { logout } = useLogout();
  const { role } = useAdminRole();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center border-b border-border bg-background/95 backdrop-blur-xs px-4 sm:px-6 gap-4">
      <SidebarTrigger aria-label="Toggle sidebar" />

      <div className="flex-1 min-w-0">
        <AdminBreadcrumb />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-10 sm:size-9"
        >
          <Link href="/notifications" aria-label="Notifications">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>

        <ModeToggle />

        <div className="h-5 w-px bg-border/60 mx-1" aria-hidden="true" />

        <div className="flex items-center gap-1.5 rounded-md bg-muted/60 border border-border/40 px-2 py-0.5">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Role
          </span>
          <span className="font-mono text-xs font-bold text-foreground">
            {formatRoleBadge(role)}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => logout()}
          className="size-10 sm:size-9"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
