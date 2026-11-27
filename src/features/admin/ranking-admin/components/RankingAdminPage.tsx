"use client";

import { usePermission } from "@/features/admin/hooks/usePermission";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

import { ConsistencyCheckPanel } from "./ConsistencyCheckPanel";
import { PeriodResetPanel } from "./PeriodResetPanel";
import { RecalculateRankingPanel } from "./RecalculateRankingPanel";

export function RankingAdminPage(): React.ReactElement {
  const permission = usePermission("ranking_recalculate");

  
  if (permission.isLoading) {
    return (
      <div
        data-testid="ranking-admin-permission-pending"
        className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 flex flex-col gap-6"
      >
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="ranking-admin-page"
      className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 flex flex-col gap-8"
    >
      <AdminPageHeader
        title="Rankings"
        description="Monitor ranking integrity, recompute scores, and manage competition periods."
      />

      {/* 1. Diagnostics & Health Inspection (Primary Full-Width Console) */}
      <section aria-label="Ranking Diagnostics">
        <ConsistencyCheckPanel />
      </section>

      {/* 2. Operations & Lifecycle Management (Balanced 2-Column Grid) */}
      <section aria-label="Ranking Operations">
        <div
          data-testid="ranking-admin-grid"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start"
        >
          <RecalculateRankingPanel />
          <PeriodResetPanel />
        </div>
      </section>
    </div>
  );
}
