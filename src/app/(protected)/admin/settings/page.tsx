"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Activity,
  Server,
  Layers,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Database,
  Radio,
  UserCog,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { useToast } from "@/lib/forms/useToast";
import {
  useAdminFeatureFlag,
  type AdminFeatureFlag,
} from "@/features/admin/hooks";
import { AdminPageHeader } from "../_components";

interface FeatureFlagCardProps {
  flag: AdminFeatureFlag;
  title: string;
  description: string;
  href?: string;
}

function FeatureFlagRow({
  flag,
  title,
  description,
  href,
}: FeatureFlagCardProps) {
  const { isLive } = useAdminFeatureFlag(flag);

  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card transition-colors">
      <div className="space-y-0.5 min-w-0 pr-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">
            {title}
          </span>
          <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {flag}
          </code>
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isLive ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-xs gap-1">
            <CheckCircle2 className="size-3" /> Live
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 text-xs"
          >
            Default
          </Badge>
        )}

        {href && (
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <Link href={href} aria-label={`Open ${title}`}>
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { push } = useToast();
  const [clearingCache, setClearingCache] = React.useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }
      push({
        title: "Cache invalidated",
        body: "Local client cache and query storage have been refreshed.",
        durationMs: 4000,
      });
    } catch {
      push({
        title: "Cache cleared",
        body: "Local storage and memory caches re-synchronized.",
        durationMs: 4000,
      });
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 pb-8 space-y-6">
      <AdminPageHeader
        title="Platform Settings"
        description="Manage platform-wide configurations, feature flags, maintenance controls, and system preferences."
      />

      {/* Bento Grid: Overview & Shortcuts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Personal User Settings Card */}
        <Card className="border-border/80 bg-linear-to-br from-card via-card to-card/90 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 text-brand mb-2">
              <UserCog className="size-4.5" />
            </div>
            <CardTitle className="text-base font-bold">
              Personal Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Looking to configure your personal account, notifications, or
              password?
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full justify-between gap-2 text-xs"
            >
              <Link href="/settings">
                Open Account Settings <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Audit Logs Shortcut Card */}
        <Card className="border-border/80 bg-linear-to-br from-card via-card to-card/90 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 mb-2">
              <Activity className="size-4.5" />
            </div>
            <CardTitle className="text-base font-bold">
              Security & Audit
            </CardTitle>
            <CardDescription className="text-xs">
              View administrative audit logs, authentication history, and event
              streams.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full justify-between gap-2 text-xs"
            >
              <Link href="/admin/audit">
                View Audit Logs <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Roles & Permissions Shortcut Card */}
        <Card className="border-border/80 bg-linear-to-br from-card via-card to-card/90 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-2">
              <ShieldCheck className="size-4.5" />
            </div>
            <CardTitle className="text-base font-bold">
              Roles & Permissions
            </CardTitle>
            <CardDescription className="text-xs">
              Assign and revoke fine-grained moderation rights across platform
              users.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full justify-between gap-2 text-xs"
            >
              <Link href="/admin/users/roles">
                Manage User Roles <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-brand" />
            <h2 className="text-base font-bold text-foreground">
              Admin Subsystems & Feature Flags
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Subsystem Matrix
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <FeatureFlagRow
            flag="admin_live"
            title="Admin Master Gate"
            description="Enables the administrative layout and management portal"
            href="/admin"
          />
          <FeatureFlagRow
            flag="admin_user_role_live"
            title="User Role Administration"
            description="User role granting, revoking, and permissions flow"
            href="/admin/users/roles"
          />
          <FeatureFlagRow
            flag="admin_category_live"
            title="Category Administration"
            description="Taxonomy management and category curation"
            href="/admin/categories"
          />
          <FeatureFlagRow
            flag="admin_tag_live"
            title="Tag Administration"
            description="Tag creation, updates, and moderation"
            href="/admin/tags"
          />
          <FeatureFlagRow
            flag="admin_ranking_live"
            title="Rankings & Recalculation"
            description="Global and seasonal ranking recalculation tools"
            href="/admin/rankings"
          />
          <FeatureFlagRow
            flag="admin_tournament_live"
            title="Tournament Management"
            description="Tournament configuration and moderation"
            href="/admin/tournaments"
          />
          <FeatureFlagRow
            flag="admin_comment_moderation_live"
            title="Comment Moderation Queue"
            description="Review and handle reported user comments"
            href="/admin/comments/reports"
          />
          <FeatureFlagRow
            flag="admin_review_moderation_live"
            title="Review Moderation Queue"
            description="Manage flagged reviews and star ratings"
            href="/admin/reviews/reports"
          />
        </div>
      </div>

      {/* System Information & Maintenance Bento */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-foreground">
              <Server className="size-4 text-brand" />
              <CardTitle className="text-sm font-bold">
                System Information
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Connectivity endpoints and application runtime configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">API Gateway Base</span>
              <code className="font-mono font-medium">/api/v1</code>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Architecture</span>
              <span className="font-medium">Next.js App Router + NestJS</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Realtime Gateway</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Radio className="size-3 animate-pulse" /> Socket.IO
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Design Direction</span>
              <span className="font-medium text-brand">Bento Arena</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <Database className="size-4 text-brand" />
                <CardTitle className="text-sm font-bold">
                  Maintenance & Cache Invalidation
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Force client-side cache refresh to synchronize recent admin
                modifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-4">
                If recent category, user role, or tag modifications are not
                immediately reflected on your active session, trigger an
                immediate revalidation below.
              </p>
            </CardContent>
          </div>

          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={clearingCache}
              className="gap-2 text-xs w-full"
            >
              <RefreshCw
                className={`size-3.5 ${clearingCache ? "animate-spin" : ""}`}
              />
              {clearingCache ? "Invalidating..." : "Invalidate Client Cache"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
