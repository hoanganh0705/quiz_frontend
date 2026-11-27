"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/Sidebar";

import { logger } from "@/shared/log";

import { AdminHeader } from "./AdminHeader";
import { AdminRoleGuard } from "./AdminRoleGuard";
import { AdminSidebar } from "./AdminSidebar";

import type React from "react";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    logger.debug("admin.route", "mount", { pathname });
  }, [pathname]);

  return (
    <AdminRoleGuard>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset id="main-content" tabIndex={-1} className="outline-none">
          <AdminHeader />
          <div className="flex-1 min-h-[calc(100vh-3.5rem)]">
            <div className="app-page-transition">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminRoleGuard>
  );
}
