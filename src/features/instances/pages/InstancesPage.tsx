"use client";

import * as React from "react";
import Link from "next/link";
import { Gamepad2, RotateCw, Plus, Compass } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  InstanceList,
} from "@/features/instances/components";
import { useListInstances } from "@/features/instances/hooks/useListInstances";
import { cn } from "@/shared/utils/merge-class-names";

export interface InstancesPageProps {
  className?: string;
}

export function InstancesPage({ className }: InstancesPageProps) {
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "open" | "running"
  >("all");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const { instances, isLoading, error, refresh } = useListInstances();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredInstances = React.useMemo(() => {
    if (statusFilter === "all") return instances;
    if (statusFilter === "open") {
      return instances.filter(
        (i) => i.status === "open" || i.status === "countdown",
      );
    }
    if (statusFilter === "running") {
      return instances.filter((i) => i.status === "running");
    }
    return instances;
  }, [instances, statusFilter]);

  return (
    <div className={cn("space-y-8", className)} data-testid="instances-page">
      {/* Header section */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Gamepad2 className="h-8 w-8 text-brand shrink-0" aria-hidden="true" />
            <span>Live Battles & Competitions</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
            Jump into real-time multiplayer quiz battles with other players, or
            choose a quiz and host your own live lobby!
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            data-testid="refresh-instances-button"
            aria-label="Refresh live rooms"
          >
            <RotateCw
              className={cn(
                "mr-1.5 h-4 w-4",
                (isLoading || isRefreshing) && "animate-spin motion-reduce:animate-none",
              )}
            />
            Refresh
          </Button>

          <Button
            asChild
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm"
          >
            <Link href="/quizzes">
              <Plus className="mr-1.5 h-4 w-4" />
              Host a Battle
            </Link>
          </Button>
        </div>
      </header>

      {/* Filter Tabs & Room Count */}
      <section className="space-y-6" aria-label="Live battle rooms">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex items-center gap-2 flex-wrap"
            role="group"
            aria-label="Filter battle rooms by status"
          >
            <Button
              type="button"
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={
                statusFilter === "all"
                  ? "bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }
              data-testid="filter-all"
              aria-pressed={statusFilter === "all"}
            >
              All Matches
            </Button>
            <Button
              type="button"
              variant={statusFilter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("open")}
              className={
                statusFilter === "open"
                  ? "bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }
              data-testid="filter-open"
              aria-pressed={statusFilter === "open"}
            >
              Open Lobbies
            </Button>
            <Button
              type="button"
              variant={statusFilter === "running" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("running")}
              className={
                statusFilter === "running"
                  ? "bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }
              data-testid="filter-running"
              aria-pressed={statusFilter === "running"}
            >
              In Progress
            </Button>
          </div>

          <span
            className="text-xs text-muted-foreground font-mono font-medium tabular-nums"
            role="status"
            aria-live="polite"
          >
            Showing {filteredInstances.length}{" "}
            {filteredInstances.length === 1 ? "room" : "rooms"}
          </span>
        </div>

        {/* Error Banner if fetch fails */}
        {error && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between"
            role="alert"
            data-testid="instances-error-banner"
          >
            <span>
              Failed to load live rooms: {error.message || "Network error"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-destructive/40 hover:bg-destructive/10"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Main Grid */}
        <InstanceList instances={filteredInstances} isLoading={isLoading} />
      </section>
    </div>
  );
}
