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
  LayoutDashboard,
  MessageSquare,
  Coins,
  ScrollText,
  Gamepad2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
import { useAdminRole } from "@/features/admin/hooks/useAdminRole";
import { useAdminFeatureFlag } from "@/features/admin/hooks/useAdminFeatureFlag";

const playItems = [
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
    title: "Explore Quizzes",
    url: "/quizzes",
    icon: Compass,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: Grid3X3,
  },
  {
    title: "Live Battles",
    url: "/instances",
    icon: Gamepad2,
  },
  {
    title: "Tournaments",
    url: "/tournaments",
    icon: Users,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: BarChart3,
  },
  {
    title: "Achievements",
    url: "/achievements",
    icon: Award,
  },
];

const communityItems = [
  {
    title: "Friends",
    url: "/friends",
    icon: UserPlus,
  },
  {
    title: "Coins",
    url: "/coins",
    icon: Coins,
  },
];

const creatorItems = [
  {
    title: "Create Quiz",
    url: "/create-quiz",
    icon: Plus,
  },
  {
    title: "My Quizzes",
    url: "/my-quizzes",
    icon: BookOpen,
  },
  {
    title: "Support",
    url: "/support",
    icon: LifeBuoy,
  },
];

const adminItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    roles: ["admin"],
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
    title: "Users",
    url: "/admin/users",
    icon: UsersRound,
    roles: ["admin"],
  },
  {
    title: "Quizzes",
    url: "/admin/quizzes",
    icon: BookOpen,
    roles: ["admin"],
  },
  {
    title: "Tournaments",
    url: "/admin/tournaments",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Audit Logs",
    url: "/admin/audit",
    icon: ScrollText,
    roles: ["admin"],
  },
  {
    title: "Rankings",
    url: "/admin/rankings",
    icon: Trophy,
    roles: ["admin"],
  },
  {
    title: "Comment Reports",
    url: "/admin/comments/reports",
    icon: MessageSquare,
    roles: ["admin", "moderator"],
  },
  {
    title: "Review Reports",
    url: "/admin/reviews/reports",
    icon: Flag,
    roles: ["admin", "moderator"],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isLoading: isAdminLoading, role } = useAdminRole();
  const { isLive } = useAdminFeatureFlag("admin_live");

  const canSeeAdmin =
    isLive && !isAdminLoading && (role === "admin" || role === "moderator");

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
        {/* Discover & Play Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2">
            Discover & Play
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {playItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(`${item.url}/`))
                    }
                    className={`${
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(`${item.url}/`))
                        ? "text-white hover:bg-brand-hover data-[active=true]:bg-brand"
                        : "text-foreground hover:bg-main-hover"
                    } text-sm flex items-center gap-2.5 rounded-md transition-colors`}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Social & Rewards Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2">
            Social & Rewards
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {communityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(`${item.url}/`))
                    }
                    className={`${
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(`${item.url}/`))
                        ? "text-white hover:bg-brand-hover data-[active=true]:bg-brand"
                        : "text-foreground hover:bg-main-hover"
                    } text-sm flex items-center gap-2.5 rounded-md transition-colors`}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Creator Studio Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2">
            Creator Studio
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {creatorItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(`${item.url}/`))
                    }
                    className={`${
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(`${item.url}/`))
                        ? "text-white hover:bg-brand-hover data-[active=true]:bg-brand"
                        : "text-foreground hover:bg-main-hover"
                    } text-sm flex items-center gap-2.5 rounded-md transition-colors`}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4 shrink-0" />
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
            <SidebarGroupLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
              <Shield className="h-3.5 w-3.5" />
              <span>Administration</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {adminItems
                  .filter((item) => role && item.roles.includes(role))
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === item.url ||
                          pathname.startsWith(`${item.url}/`)
                        }
                        className={`${
                          pathname === item.url ||
                          pathname.startsWith(`${item.url}/`)
                            ? "text-white hover:bg-brand-hover data-[active=true]:bg-brand"
                            : "text-foreground hover:bg-main-hover"
                        } text-sm flex items-center gap-2.5 rounded-md transition-colors`}
                      >
                        <Link href={item.url}>
                          <item.icon className="size-4 shrink-0" />
                          <span className="text-sm font-medium">
                            {item.title}
                          </span>
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
