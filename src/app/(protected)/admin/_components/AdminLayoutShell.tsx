"use client";

import type React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/Sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminRoleGuard } from "@/features/admin/components/AdminRoleGuard";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
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
