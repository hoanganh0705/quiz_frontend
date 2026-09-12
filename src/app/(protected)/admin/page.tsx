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
 * Source epic:   Phase 1 (F-1 in the remaining-gaps plan) — strip
 *                hardcoded `stats` / `recentActivity` literals so no
 *                fake numbers are visible to admins.
 * Source ticket: F-1.
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
    label: "Manage Quizzes",
    href: "/admin/quizzes",
    description: "Review and moderate quizzes",
    icon: Swords,
  },
  {
    label: "Manage Users",
    href: "/admin/users",
    description: "User accounts and permissions",
    icon: Users,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="px-4 sm:px-6 pb-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Manage your platform from here.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/" aria-label="View the public site">
            <Eye className="h-4 w-4" aria-hidden="true" />
            View Site
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
        className="border-border bg-muted/40"
      >
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="space-y-1 text-sm text-foreground/80">
            <p className="font-medium text-foreground">
              Platform-wide aggregate stats are not available yet.
            </p>
            <p>
              Live counts (total quizzes, active users, average score,
              recent activity) will appear here once the admin
              analytics endpoint ships. For now, use the{" "}
              <Link
                href="/admin/audit"
                className="font-medium text-brand underline-offset-4 hover:underline"
              >
                audit log
              </Link>{" "}
              for platform activity, or open one of the management
              areas below.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="border-border sm:col-span-2 lg:col-span-4"
          data-testid="admin-dashboard-quick-actions"
        >
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 hover:border-brand transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <link.icon
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-brand">
                        {link.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Platform Activity</CardTitle>
          <CardDescription>
            See the live audit log for moderation and administrative
            events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/audit" aria-label="Open the audit log">
              <Activity className="h-4 w-4" aria-hidden="true" />
              Open Audit Log
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
