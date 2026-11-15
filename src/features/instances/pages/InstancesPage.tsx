"use client";

import * as React from "react";
import Link from "next/link";
import { Gamepad2, RotateCw, Plus, Compass } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  InstanceList,
  InstancePlaceholder,
} from "@/features/instances/components";
import { useInstancesFeatureFlag } from "@/features/instances/hooks/useInstancesFeatureFlag";
import { useListInstances } from "@/features/instances/hooks/useListInstances";
import { cn } from "@/shared/utils/merge-class-names";

export interface InstancesPageProps {
  className?: string;
}

export function InstancesPage({ className }: InstancesPageProps) {
  const { isPlaceholder } = useInstancesFeatureFlag();
  const [statusFilter, setStatusFilter] = React.useState<"all" | "open" | "running">("all");
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
      return instances.filter((i) => i.status === "open" || i.status === "countdown");
    }
    if (statusFilter === "running") {
      return instances.filter((i) => i.status === "running");
    }
    return instances;
  }, [instances, statusFilter]);

  if (isPlaceholder) {
    return <InstancePlaceholder />;
  }

  return (
    <div className={cn("space-y-8", className)} data-testid="instances-page">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Gamepad2 className="h-8 w-8 text-brand" />
            Live Battles & Competitions
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Jump into real-time multiplayer quiz battles with other players, or choose a quiz and host your own live lobby!
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              className={cn("mr-1.5 h-4 w-4", (isLoading || isRefreshing) && "animate-spin")}
            />
            Refresh
          </Button>

          <Button asChild size="sm" className="bg-brand text-white hover:bg-brand-hover shadow-sm">
            <Link href="/quizzes">
              <Plus className="mr-1.5 h-4 w-4" />
              Host a Battle
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Room Count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2" role="tablist" aria-label="Room status filter">
          <Button
            type="button"
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className={statusFilter === "all" ? "bg-brand text-white hover:bg-brand-hover" : ""}
            data-testid="filter-all"
            role="tab"
            aria-selected={statusFilter === "all"}
          >
            All Matches
          </Button>
          <Button
            type="button"
            variant={statusFilter === "open" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("open")}
            className={statusFilter === "open" ? "bg-brand text-white hover:bg-brand-hover" : ""}
            data-testid="filter-open"
            role="tab"
            aria-selected={statusFilter === "open"}
          >
            Open Lobbies
          </Button>
          <Button
            type="button"
            variant={statusFilter === "running" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("running")}
            className={statusFilter === "running" ? "bg-brand text-white hover:bg-brand-hover" : ""}
            data-testid="filter-running"
            role="tab"
            aria-selected={statusFilter === "running"}
          >
            In Progress
          </Button>
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          Showing {filteredInstances.length} {filteredInstances.length === 1 ? "room" : "rooms"}
        </span>
      </div>

      {/* Error Banner if fetch fails */}
      {error && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between"
          role="alert"
          data-testid="instances-error-banner"
        >
          <span>Failed to load live rooms: {error.message || "Network error"}</span>
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
    </div>
  );
}
