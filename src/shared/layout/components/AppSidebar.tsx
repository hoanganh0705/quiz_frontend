"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArrowUpRight, BookOpen, Shield } from "lucide-react";

import { useAdminRole } from "@/features/admin/hooks/useAdminRole";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/Sidebar";

import { APP_NAV_GROUPS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

import type * as React from "react";

function isItemActive(pathname: string, url: string): boolean {
  if (url === "/") {
    return pathname === "/";
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isLoading: isAdminLoading, permissions } = useAdminRole();

  const canSeeAdmin = !isAdminLoading && permissions.length > 0;

  return (
    <Sidebar
      collapsible="icon"
      className="dark:bg-background bg-background"
      {...props}
    >
      <SidebarHeader className="border-x border-border pointer-events-none">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand text-white">
                  <BookOpen className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-base text-foreground">
                    QuizHub
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-background border border-border">
        {APP_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const active = isItemActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "text-sm flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-150",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                            : "text-foreground/80 hover:bg-main-hover hover:text-foreground",
                        )}
                      >
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 w-full"
                        >
                          <item.icon
                            className={cn(
                              "size-4 shrink-0 transition-colors",
                              active
                                ? "text-sidebar-accent-foreground"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Admin Section - Only visible to admin/moderator users */}
        {canSeeAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
              <span>Administration</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  {(() => {
                    const isAdminActive =
                      pathname === "/admin" || pathname.startsWith("/admin/");
                    return (
                      <SidebarMenuButton
                        asChild
                        isActive={isAdminActive}
                        className={cn(
                          "text-sm flex items-center justify-between rounded-lg px-2.5 py-2 transition-all duration-150",
                          isAdminActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                            : "text-foreground/80 hover:bg-main-hover hover:text-foreground",
                        )}
                      >
                        <Link
                          href="/admin"
                          className="flex items-center justify-between w-full"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Shield
                              className={cn(
                                "size-4 shrink-0 transition-colors",
                                isAdminActive
                                  ? "text-sidebar-accent-foreground"
                                  : "text-brand",
                              )}
                            />
                            <span className="text-sm font-medium truncate">
                              Admin Portal
                            </span>
                          </div>
                          <ArrowUpRight
                            className={cn(
                              "size-3.5 shrink-0 transition-colors",
                              isAdminActive
                                ? "text-sidebar-accent-foreground/80"
                                : "text-muted-foreground/60",
                            )}
                          />
                        </Link>
                      </SidebarMenuButton>
                    );
                  })()}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
