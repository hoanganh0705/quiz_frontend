import type { Metadata } from "next";
import {
  BookOpen,
  Tag,
  Users,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

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

const stats = [
  {
    title: "Total Quizzes",
    value: "1,284",
    change: "+12%",
    trend: "up",
    icon: BookOpen,
    description: "Active quizzes available",
  },
  {
    title: "Categories",
    value: "24",
    change: "+2",
    trend: "up",
    icon: Tag,
    description: "Content categories",
  },
  {
    title: "Active Users",
    value: "8,547",
    change: "+5.3%",
    trend: "up",
    icon: Users,
    description: "Registered this month",
  },
  {
    title: "Avg. Score",
    value: "68.4%",
    change: "-1.2%",
    trend: "down",
    icon: BarChart3,
    description: "Across all quizzes",
  },
];

const recentActivity = [
  {
    id: 1,
    action: "New quiz published",
    user: "QuizMaster42",
    time: "2 min ago",
  },
  { id: 2, action: "Category updated", user: "AdminSarah", time: "15 min ago" },
  { id: 3, action: "User banned", user: "AdminJohn", time: "1 hour ago" },
  { id: 4, action: "New user registered", user: "System", time: "2 hours ago" },
  {
    id: 5,
    action: "Quiz flagged for review",
    user: "AutoMod",
    time: "3 hours ago",
  },
];

const quickLinks = [
  {
    label: "Manage Categories",
    href: "/admin/categories",
    description: "Add, edit, or remove categories",
  },
  {
    label: "Manage Tags",
    href: "/admin/tags",
    description: "Organize quiz tags",
  },
  {
    label: "Manage Quizzes",
    href: "/admin/quizzes",
    description: "Review and moderate quizzes",
  },
  {
    label: "Manage Users",
    href: "/admin/users",
    description: "User accounts and permissions",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="px-4 sm:px-6 pb-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <Button className="gap-2">
          <Eye className="h-4 w-4" />
          View Site
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
          const trendColor =
            stat.trend === "up" ? "text-green-600" : "text-red-500";
          return (
            <Card key={stat.title} className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="p-2 rounded-md bg-muted">
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-xs font-medium flex items-center gap-0.5 ${trendColor}`}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {stat.change}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stat.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest actions across the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-brand" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {item.user}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 hover:border-brand transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-brand">
                    {link.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {link.description}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
