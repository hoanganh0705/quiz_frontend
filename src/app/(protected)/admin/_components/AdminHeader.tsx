"use client";

import type React from "react";
import { Bell, LogOut } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ModeToggle } from "@/shared/layout/components/ModeToggle";
import { SidebarTrigger } from "@/components/ui/Sidebar";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { AdminBreadcrumb } from "@/features/admin/components/AdminBreadcrumb";

export function AdminHeader() {
  const { logout } = useLogout();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center border-b border-border bg-background/95 backdrop-blur-xs px-4 sm:px-6 gap-4">
      <SidebarTrigger aria-label="Toggle sidebar" />
      {/* Breadcrumb landmark — primary navigation orientation */}
      <div className="flex-1 min-w-0">
        <AdminBreadcrumb />
      </div>

      {/* Header-right cluster */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative size-10 sm:size-9"
        >
          <Bell className="h-4 w-4" />
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive"
            aria-hidden="true"
          />
          <span className="sr-only">Unread notifications</span>
        </Button>

        <ModeToggle />

        <div className="h-5 w-px bg-border/60 mx-1" />

        <div className="flex items-center gap-1.5 rounded-md bg-muted/60 border border-border/40 px-2 py-0.5">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Role
          </span>
          <span className="font-mono text-xs font-bold text-foreground">
            Admin
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => logout()}
          className="size-10 sm:size-9"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
