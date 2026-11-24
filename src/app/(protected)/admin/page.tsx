import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Tag,
  Users,
  Swords,
  Eye,
  ArrowUpRight,
  Activity,
  AlertCircle,
  Trophy,
  MessageSquare,
  Star,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * `/admin` — admin landing page.
 *
 * Per the Sep 2026 user direction ("make sure no fake stats exist"),
 * this page intentionally renders ZERO platform-wide aggregate numbers
 * until a real `/admin/stats` (or equivalent) endpoint ships. The
 * historic hardcoded arrays have been deleted (see git history).
 *
 * What the page DOES render:
 *   1. An honest banner explaining why no aggregate numbers appear.
 *   2. A "Quick Actions" grid pointing to every admin sub-area that
 *      IS already wired to real APIs.
 *   3. A CTA to `/admin/audit` for live platform activity.
 *
 * What the page does NOT render:
 *   - Total quizzes / categories / active users / average score cards.
 *   - "Recent activity" feed with fake usernames.
 *
 * When a real aggregate endpoint is built, those surfaces can be
 * reintroduced here using the same Tailwind card scaffolding.
 */

const quickLinks = [
  {
    label: "Manage Quizzes",
    href: "/admin/quizzes",
    description: "Review and moderate quizzes",
    icon: Swords,
  },
  {
    label: "Manage Tournaments",
    href: "/admin/tournaments",
    description: "Configure competitive tournaments",
    icon: Trophy,
  },
  {
    label: "Manage Categories",
    href: "/admin/categories",
    description: "Add, edit, or remove categories",
    icon: Tag,
  },
  {
    label: "Manage Tags",
    href: "/admin/tags",
    description: "Organize quiz tags",
    icon: BookOpen,
  },
  {
    label: "Manage Users",
    href: "/admin/users",
    description: "User accounts and permissions",
    icon: Users,
  },
  {
    label: "Comment Reports",
    href: "/admin/comments/reports",
    description: "Moderation queue for comments",
    icon: MessageSquare,
  },
  {
    label: "Review Reports",
    href: "/admin/reviews/reports",
    description: "Flagged quiz reviews and ratings",
    icon: Star,
  },
  {
    label: "Audit Log",
    href: "/admin/audit",
    description: "Live administrative actions and events",
    icon: Activity,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Manage your platform from here.
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0 self-start sm:self-auto shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
          <Link href="/" aria-label="View the public site">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>View Site</span>
          </Link>
        </Button>
      </div>

      {/*
        Honest placeholder banner — surfaces the gap explicitly so
        admins are not misled by invented numbers. The banner is
        dismissible visually by being small / non-blocking; it is
        NOT dismissible (no X button) because the absence of the
        data is permanent for now.
      */}
      <Card
        role="status"
        data-testid="admin-dashboard-placeholder-banner"
        className="rounded-2xl border-border/70 bg-muted/30 backdrop-blur-sm shadow-xs"
      >
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="space-y-1 text-sm text-foreground/80">
            <p className="font-medium text-foreground">
              Platform-wide aggregate stats are not available yet.
            </p>
            <p>
              Live counts (total quizzes, active users, average score, recent
              activity) will appear here once the admin analytics endpoint
              ships. For now, use the{" "}
              <Link
                href="/admin/audit"
                className="font-medium text-brand underline-offset-4 hover:underline hover:text-brand-hover transition-colors"
              >
                audit log
              </Link>{" "}
              for platform activity, or open one of the management areas below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card
        className="rounded-2xl border-border/70 bg-card/75 shadow-xs backdrop-blur-sm py-6 sm:py-8"
        data-testid="admin-dashboard-quick-actions"
      >
        <CardHeader className="px-6 sm:px-8">
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common management tasks</CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-4 sm:py-4.5 shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg border border-border/40 bg-muted/60 p-2 shrink-0 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                    <link.icon
                      className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary truncate">
                      {link.label}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {link.description}
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  className="h-4 w-4 text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary shrink-0 ml-2"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Activity Strip */}
      <Card className="rounded-2xl border-border/70 bg-card/75 shadow-xs backdrop-blur-sm">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-foreground">
                Platform Activity & Audit Log
              </h2>
              <p className="text-sm text-muted-foreground">
                Inspect live administrative actions, role modifications, and moderation decisions.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="shrink-0 gap-2 rounded-lg self-start sm:self-auto transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0"
          >
            <Link href="/admin/audit" aria-label="Open the audit log">
              <span>Open Audit Log</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
