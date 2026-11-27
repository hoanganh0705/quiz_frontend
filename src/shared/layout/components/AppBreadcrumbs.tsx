"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { PAGE_GUTTER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const SEGMENT_NAME_MAP: Readonly<Record<string, string>> = {
  quizzes: "Quizzes",
  categories: "Categories",
  tags: "Tags",
  "daily-challenge": "Today's Challenge",
  leaderboard: "Leaderboard",
  rankings: "Rankings",
  achievements: "Achievements",
  coins: "Coins Wallet",
  friends: "Friends",
  social: "Social",
  tournaments: "Tournaments",
  tournament: "Tournaments",
  instances: "Live Battles",
  "create-quiz": "Create Quiz",
  "my-quizzes": "My Quizzes",
  "my-profile": "My Profile",
  "quiz-history": "Quiz History",
  bookmarks: "Bookmarks",
  notifications: "Notifications",
  preferences: "Preferences",
  settings: "Settings",
  security: "Security",
  support: "Support",
  search: "Search",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  attempt: "Active Quiz",
  results: "Quiz Results",
  play: "Live Play",
  edit: "Edit",
  versions: "Versions",
  questions: "Questions",
  "friend-requests": "Friend Requests",
  incoming: "Incoming",
  outgoing: "Outgoing",
  followers: "Followers",
  following: "Following",
  blocked: "Blocked Users",
  suggestions: "Suggestions",
  trending: "Trending",
  analytics: "Analytics",
  feed: "Feed",
  admin: "Admin",
  audit: "Audit Logs",
  comments: "Comments",
  reviews: "Reviews",
  reports: "Reports",
  users: "Users",
  roles: "Roles",
};

/**
 * Intermediate path patterns that have no `page.tsx` and would 404 if linked.
 * Breadcrumbs render these segments as non-interactive `<span>` elements.
 */
const NON_ROUTABLE_INTERMEDIATE_PATTERNS: readonly RegExp[] = [
  /^\/my-quizzes\/[^/]+$/,
  /^\/my-quizzes\/[^/]+\/versions$/,
  /^\/my-quizzes\/[^/]+\/versions\/[^/]+$/,
  /^\/social\/friends$/,
  /^\/social\/friend-requests$/,
  /^\/social\/me$/,
  /^\/social\/users$/,
  /^\/social\/users\/[^/]+$/,
  /^\/admin\/comments$/,
  /^\/admin\/reviews$/,
  /^\/admin\/achievements$/,
  /^\/admin\/achievements\/users$/,
];

function isRoutableBreadcrumbPath(href: string): boolean {
  return !NON_ROUTABLE_INTERMEDIATE_PATTERNS.some((pattern) =>
    pattern.test(href),
  );
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_OR_ID_REGEX = /^[0-9a-f]{16,}$/i;

function formatSegmentLabel(segment: string, prevSegment?: string): string {
  if (SEGMENT_NAME_MAP[segment]) {
    return SEGMENT_NAME_MAP[segment]!;
  }
  if (UUID_REGEX.test(segment) || HASH_OR_ID_REGEX.test(segment)) {
    if (prevSegment === "quiz-history") return "Attempt Details";
    if (prevSegment === "users") return "User Details";
    if (prevSegment === "tournaments") return "Tournament Details";
    if (prevSegment === "instances") return "Live Match";
    if (prevSegment === "versions") return "Version Details";
    if (prevSegment === "my-quizzes") return "Quiz";
    if (prevSegment === "bookmarks") return "Collection";
    return `#${segment.slice(0, 8)}…`;
  }
  return titleCase(segment);
}

export const AppBreadcrumbs = memo(function AppBreadcrumbs() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);

    return segments.map((segment, index) => {
      const prev = index > 0 ? segments[index - 1] : undefined;
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      return {
        label: formatSegmentLabel(segment, prev),
        href,
        routable: isRoutableBreadcrumbPath(href),
      };
    });
  }, [pathname]);

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(PAGE_GUTTER_CLASS, "pt-3 pb-0.5")}
    >
      <ol className="flex items-center gap-1 text-xs text-foreground-secondary overflow-x-auto whitespace-nowrap scrollbar-none">
        <li>
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1 shrink-0">
              <ChevronRight
                className="h-3 w-3 text-muted-foreground/60"
                aria-hidden="true"
              />
              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : crumb.routable ? (
                <Link
                  href={crumb.href}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-muted-foreground">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
