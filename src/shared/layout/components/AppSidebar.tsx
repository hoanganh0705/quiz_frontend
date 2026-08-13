"use client";

import type * as React from "react";
import {
  BookOpen,
  Home,
  Trophy,
  Grid3X3,
  Compass,
  UserPlus,
  Users,
  BarChart3,
  Plus,
  LifeBuoy,
  Shield,
  UsersRound,
  Flag,
  Award,
  Settings,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/Sidebar";
import { UserAvatarDropdown } from "@/shared/ui/UserAvatarDropdown";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { useAdminRole } from "@/features/admin/hooks/useAdminRole";
import { useAdminFeatureFlag } from "@/features/admin/hooks/useAdminFeatureFlag";
import { Button } from "@/components/ui/Button";

const sidebarItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Today's Challenge",
    url: "/daily-challenge",
    icon: Trophy,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: Grid3X3,
  },
  {
    title: "Explore Quizzes",
    url: "/quizzes",
    icon: Compass,
  },
  {
    title: "Friends",
    url: "/friends",
    icon: UserPlus,
  },
  {
    title: "Quiz Tournament",
    url: "/tournament",
    icon: Users,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: BarChart3,
  },
  {
    title: "Create Quiz",
    url: "/create-quiz",
    icon: Plus,
  },
  {
    title: "Support",
    url: "/support",
    icon: LifeBuoy,
  },
];

// Admin navigation items
const adminItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: UsersRound,
    roles: ["admin"],
  },
  {
    title: "Reports",
    url: "/admin/reports",
    icon: Flag,
    roles: ["admin", "moderator"],
  },
  {
    title: "Categories",
    url: "/admin/categories",
    icon: Grid3X3,
    roles: ["admin"],
  },
  {
    title: "Tags",
    url: "/admin/tags",
    icon: Award,
    roles: ["admin"],
  },
  {
    title: "Comments",
    url: "/admin/comments",
    icon: MessageSquare,
    roles: ["admin", "moderator"],
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthState();
  const { isLoading: isAdminLoading, role } = useAdminRole();
  const { isLive } = useAdminFeatureFlag("admin_live");

  const canSeeAdmin = isLive && !isAdminLoading && (role === "admin" || role === "moderator");
  const isAdmin = role === "admin";

  return (
    <Sidebar
      collapsible="icon"
      className="dark:bg-background bg-background"
      {...props}
    >
      <SidebarHeader className=" border-x border-border pointer-events-none">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand">
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
      <SidebarContent className=" bg-background border border-border">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className={`${
                      pathname === item.url
                        ? "text-white hover:bg-main-hover data-[active=true]:bg-brand"
                        : "text-foreground hover:bg-main-hover"
                    } text-sm flex items-center gap-2`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span className="text-sm font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only visible to admin/moderator users */}
        {canSeeAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Administration</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-3">
                {adminItems
                  .filter((item) => item.roles.includes(role!))
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                        className={`${
                          pathname === item.url || pathname.startsWith(`${item.url}/`)
                            ? "text-white hover:bg-main-hover data-[active=true]:bg-brand"
                            : "text-foreground hover:bg-main-hover"
                        } text-sm flex items-center gap-2`}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span className="text-sm font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
