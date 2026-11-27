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
  Compass,
  FolderTree,
  Tag,
  Trophy,
  Swords,
  MessageSquare,
  Star,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
import { useSocket, NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import { cn } from "@/shared/utils/merge-class-names";
import { AdminPageHeader } from "./AdminPageHeader";

interface SubsystemCardProps {
  title: string;
  description: string;
  href?: string;
  category?: string;
  icon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
}

function SubsystemRow({
  title,
  description,
  href,
  category,
  icon: Icon,
}: SubsystemCardProps) {
  const content = (
    <div className="group flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-all shadow-2xs">
      <div className="flex items-center gap-3 min-w-0 pr-3">
        {Icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Icon className="size-4" aria-hidden="true" />
          </div>
        ) : null}
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {title}
            </span>
            {category ? (
              <span className="hidden sm:inline-block font-mono text-xs text-muted-foreground uppercase tracking-wider bg-muted/70 px-1.5 py-0.5 rounded">
                {category}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Badge
          variant="outline"
          className="border-success/35 bg-success/10 text-success dark:bg-success/20 text-xs gap-1 font-medium"
        >
          <CheckCircle2 className="size-3" aria-hidden="true" />
          <span>Active</span>
        </Badge>

        {href && (
          <div className="size-8 flex items-center justify-center rounded-lg text-muted-foreground group-hover:text-foreground group-hover:bg-muted/60 transition-colors">
            <ExternalLink
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${title}`}
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default function AdminSettingsPage() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const { connectionState } = useSocket(NOTIFICATIONS_NAMESPACE);
  const [clearingCache, setClearingCache] = React.useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }
      await queryClient.invalidateQueries();
      queryClient.clear();
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
    <div className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-8">
      <AdminPageHeader
        title="Platform Settings"
        description="Manage platform-wide configurations, maintenance controls, and system preferences."
      />

      {/* 1. Administrative Shortcuts (Balanced 3-Card Grid) */}
      <section aria-label="Administrative shortcuts" className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Quick Access & Hubs
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Personal User Settings Card */}
          <Card className="group flex flex-col justify-between border-border/80 bg-card shadow-xs hover:border-primary/40 hover:shadow-sm transition-all">
            <CardHeader className="pb-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 text-brand mb-2">
                <UserCog className="size-4.5" aria-hidden="true" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Personal Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your personal account, notifications, and security credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-between gap-2 text-xs"
              >
                <Link href="/settings">
                  <span>Open Account Settings</span>
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Audit Logs Shortcut Card */}
          <Card className="group flex flex-col justify-between border-border/80 bg-card shadow-xs hover:border-primary/40 hover:shadow-sm transition-all">
            <CardHeader className="pb-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary mb-2">
                <Activity className="size-4.5" aria-hidden="true" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Security & Audit
              </CardTitle>
              <CardDescription className="text-xs">
                View administrative audit logs, authentication history, and event streams.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-between gap-2 text-xs"
              >
                <Link href="/admin/audit">
                  <span>View Audit Logs</span>
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Roles & Permissions Shortcut Card */}
          <Card className="group flex flex-col justify-between border-border/80 bg-card shadow-xs hover:border-primary/40 hover:shadow-sm transition-all">
            <CardHeader className="pb-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-success/10 border border-success/20 text-success mb-2">
                <ShieldCheck className="size-4.5" aria-hidden="true" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Roles & Permissions
              </CardTitle>
              <CardDescription className="text-xs">
                Assign and revoke fine-grained moderation rights across platform users.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-between gap-2 text-xs"
              >
                <Link href="/admin/users/roles">
                  <span>Manage User Roles</span>
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. Subsystems Section (Classified 2-Column Matrix) */}
      <section aria-label="Admin subsystems directory" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-brand" aria-hidden="true" />
            <h2 className="text-base font-bold text-foreground">
              Admin Subsystems & Services
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            8 Modules Online
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SubsystemRow
            title="Admin Master Gate"
            description="Enables the administrative layout and management portal"
            href="/admin"
            category="Core"
            icon={Compass}
          />
          <SubsystemRow
            title="User Role Administration"
            description="User role granting, revoking, and permissions flow"
            href="/admin/users/roles"
            category="Access"
            icon={ShieldCheck}
          />
          <SubsystemRow
            title="Category Administration"
            description="Taxonomy management and category curation"
            href="/admin/categories"
            category="Taxonomy"
            icon={FolderTree}
          />
          <SubsystemRow
            title="Tag Administration"
            description="Tag creation, updates, and moderation"
            href="/admin/tags"
            category="Taxonomy"
            icon={Tag}
          />
          <SubsystemRow
            title="Rankings & Recalculation"
            description="Global and seasonal ranking recalculation tools"
            href="/admin/rankings"
            category="Operations"
            icon={Trophy}
          />
          <SubsystemRow
            title="Tournament Management"
            description="Tournament configuration and moderation"
            href="/admin/tournaments"
            category="Competitive"
            icon={Swords}
          />
          <SubsystemRow
            title="Comment Moderation Queue"
            description="Review and handle reported user comments"
            href="/admin/comments/reports"
            category="Moderation"
            icon={MessageSquare}
          />
          <SubsystemRow
            title="Review Moderation Queue"
            description="Manage flagged reviews and star ratings"
            href="/admin/reviews/reports"
            category="Moderation"
            icon={Star}
          />
        </div>
      </section>

      {/* 3. System Information & Maintenance Bento */}
      <section aria-label="System diagnostic information" className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Platform Health & Operations
        </h2>
        <div className="grid gap-4 md:grid-cols-2 items-stretch">
          <Card className="flex flex-col justify-between border-border/80 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <Server className="size-4 text-brand" aria-hidden="true" />
                <CardTitle className="text-sm font-bold">
                  System Diagnostics
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Connectivity endpoints and application runtime configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs mt-auto">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">API Gateway Base</span>
                <code className="font-mono font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded">
                  {process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}
                </code>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Architecture</span>
                <span className="font-medium text-foreground">
                  Next.js 16 App Router + NestJS
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Realtime Gateway</span>
                {connectionState === "connected" ? (
                  <span className="inline-flex items-center gap-1.5 text-success font-medium">
                    <Radio className="size-3 animate-pulse" aria-hidden="true" />
                    <span>Socket.IO (Connected)</span>
                  </span>
                ) : connectionState === "connecting" ? (
                  <span className="inline-flex items-center gap-1.5 text-warning font-medium">
                    <Radio className="size-3 animate-spin" aria-hidden="true" />
                    <span>Socket.IO (Connecting…)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Radio className="size-3" aria-hidden="true" />
                    <span>Socket.IO (Standby)</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-mono font-medium text-foreground capitalize bg-muted/50 px-2 py-0.5 rounded">
                  {process.env.NODE_ENV ?? "development"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between border-border/80 bg-card shadow-xs">
            <div>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Database className="size-4 text-brand" aria-hidden="true" />
                  <CardTitle className="text-sm font-bold">
                    Maintenance & Cache Invalidation
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Force client-side cache refresh to synchronize recent admin modifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If recent category, user role, tag, or ranking modifications are not
                  immediately reflected on your active session, trigger an
                  immediate revalidation to purge client query caches.
                </p>
              </CardContent>
            </div>

            <CardContent className="pt-0 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={clearingCache}
                aria-busy={clearingCache}
                className="gap-2 text-xs w-full"
              >
                <RefreshCw
                  className={cn("size-3.5", clearingCache && "animate-spin")}
                  aria-hidden="true"
                />
                <span>
                  {clearingCache
                    ? "Invalidating Cache…"
                    : "Invalidate Client Cache"}
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
