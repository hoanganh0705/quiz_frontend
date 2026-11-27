import {
  Award,
  BarChart3,
  Bookmark,
  BookOpen,
  Coins,
  Compass,
  Gamepad2,
  Grid3X3,
  History,
  Home,
  LifeBuoy,
  Plus,
  Settings,
  Sparkles,
  Tag,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

/**
 * Canonical page shell & gutter tokens modeled on `/daily-challenge`.
 *
 * Every standard page inside `LayoutShell` (`SidebarInset`) and `AppBreadcrumbs`
 * MUST share these horizontal gutters so the breadcrumb trail and page edges
 * remain pixel-parallel across every route and viewport.
 */
export const PAGE_GUTTER_CLASS = "w-full px-4 md:px-8 lg:px-12";

export const PAGE_CONTAINER_CLASS =
  "min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12";

export {
  AUTH_ROUTES as AUTH_PAGES,
  isAuthRoute as isAuthPage,
  isShellRoute as isShellPage,
  SHELL_EXACT_PATHS,
  SHELL_PREFIXES,
} from "@/shared/config/routes";

export interface AppNavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
}

export interface AppNavGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly AppNavItem[];
}

export const APP_NAV_GROUPS: readonly AppNavGroup[] = [
  {
    id: "play",
    label: "Discover & Play",
    items: [
      { icon: Home, label: "Home", href: "/" },
      { icon: Trophy, label: "Today's Challenge", href: "/daily-challenge" },
      { icon: Compass, label: "Explore Quizzes", href: "/quizzes" },
      { icon: Grid3X3, label: "Categories", href: "/categories" },
      { icon: Tag, label: "Tags", href: "/tags" },
      { icon: Gamepad2, label: "Live Battles", href: "/instances" },
      { icon: Users, label: "Tournaments", href: "/tournaments" },
      { icon: BarChart3, label: "Leaderboard", href: "/leaderboard" },
      { icon: Award, label: "Achievements", href: "/achievements" },
    ],
  },
  {
    id: "library",
    label: "My Library",
    items: [
      { icon: Bookmark, label: "Saved Quizzes", href: "/bookmarks" },
      { icon: History, label: "Quiz History", href: "/quiz-history" },
    ],
  },
  {
    id: "community",
    label: "Social & Rewards",
    items: [
      { icon: UserPlus, label: "Friends", href: "/friends" },
      { icon: Sparkles, label: "Social Feed", href: "/social" },
      { icon: Coins, label: "Coins", href: "/coins" },
    ],
  },
  {
    id: "creator",
    label: "Creator Studio",
    items: [
      { icon: Plus, label: "Create Quiz", href: "/create-quiz" },
      { icon: BookOpen, label: "My Quizzes", href: "/my-quizzes" },
      { icon: LifeBuoy, label: "Support", href: "/support" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ],
  },
] as const;

/**
 * Flat projection of `APP_NAV_GROUPS` for command palette / quick search.
 */
export const sidebarItems: readonly AppNavItem[] = APP_NAV_GROUPS.flatMap(
  (group) => group.items,
);
