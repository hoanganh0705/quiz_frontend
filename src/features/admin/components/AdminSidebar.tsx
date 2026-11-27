"use client";

import type * as React from "react";
import Link from "next/link";
import { Shield, ChevronLeft } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/Sidebar";

import { AdminNav } from "@/features/admin/components/AdminNav";

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar"
      {...props}
    >
      <SidebarHeader className="border-r border-sidebar-border pointer-events-none">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent"
            >
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-base text-sidebar-foreground">
                    Admin
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Permission-derived nav — driven by useAdminNav */}
      <SidebarContent className="bg-background border-r border-sidebar-border overflow-y-auto overflow-x-hidden">
        <AdminNav />
      </SidebarContent>

      <SidebarFooter className="bg-background border-r border-t border-sidebar-border">
        {/* Back to app */}
        <SidebarMenu className="px-2 py-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="group text-foreground hover:bg-main-hover transition-all duration-150 rounded-md"
            >
              <Link href="/" className="flex items-center gap-2.5 min-w-0">
                <ChevronLeft className="size-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5" />
                <span className="text-sm font-medium truncate">
                  Back to App
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
