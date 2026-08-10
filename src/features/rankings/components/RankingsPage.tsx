"use client";

/**
 * `RankingsPage` — Story 5.5 ranking surfaces composition.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F1.
 *
 * Composes:
 *
 *   - `<RankingSummaryCard />` (TKT-5.5.D1) — personal summary at the
 *     top.
 *   - `<MilestonesList />` (TKT-5.5.D2) — milestones (the documented
 *     subset is styled distinctly).
 *   - `<LeaderboardTable />` (TKT-5.5.D1) — global leaderboard with
 *     ties preserved in backend order, pagination, and current-user
 *     highlighting. The page-level **period filter** (weekly / monthly
 *     / all-time) is rendered above the table and writes to the URL
 *     query state so shareable / refreshable URLs work (F1 AC #4).
 *   - `<RankingHistory />` (TKT-5.5.D1) — chronological history.
 *
 * The page is a client component because every child reads from SWR
 * and the auth bootstrap. The route entry
 * (`app/(public)/rankings/page.tsx`) is the server component that owns
 * the metadata and delegates here.
 *
 * ## Feature flag gating (F1 AC #1)
 *
 * When `rankings_live === 'placeholder'`, the page renders the
 * documented Phase 3 placeholder view (`RankingsPlaceholder`).
 * Without this, every child component would early-return `null` and
 * the shell would be empty — that's a regression from the Phase 3
 * convention where every gated page shows an explicit "coming soon"
 * card.
 *
 * ## Auth gating (F1 AC #2 / #3)
 *
 * The personal surfaces (`RankingSummaryCard`, `RankingHistory`,
 * `MilestonesList`) are hidden for unauthenticated users; the public
 * `LeaderboardTable` is visible to everyone. The child components
 * self-gate on `useAuthBootstrap`.
 *
 * ## Period filter UX (F1 AC #4 / #5)
 *
 * The period selector is a pill group with three buttons (Weekly,
 * Monthly, All time) that write to the URL query state via
 * `router.replace`. The selected period is passed down to
 * `<LeaderboardTable />` which propagates it into the
 * `useRankingLeaderboard` SWR key — filter changes therefore reset
 * pagination to the first offset.
 *
 * Tied entries render in backend order because
 * `RankingLeaderboardEntry.isCurrentUser` (server-authoritative) is
 * the only source of highlighting. No client-side reordering happens
 * here.
 *
 * ## Realtime wiring
 *
 * The notification-driven revalidation bridge
 * (`useAchievementNotificationRevalidation`) is not mounted here —
 * rankings do not currently subscribe to achievement notifications.
 * Mount the bridge at the route shell when achievement surface is
 * loaded too.
 */

import { Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Filter } from "lucide-react";

import { isRankingSurfaceEnabled } from "@/features/rankings/flags";
import { RankingSummaryCard } from "@/features/rankings/components/RankingSummaryCard";
import { MilestonesList } from "@/features/rankings/components/MilestonesList";
import { LeaderboardTable } from "@/features/rankings/components/LeaderboardTable";
import { RankingHistory } from "@/features/rankings/components/RankingHistory";
import { RankingsPlaceholder } from "@/features/rankings/components/shared/Placeholder";
import type { RankingPeriod } from "@/features/rankings/types";

interface RankingsPageProps {
  className?: string;
}

const QUERY_PERIOD = "period";

const DEFAULT_PERIOD: RankingPeriod = "all_time";

/**
 * Parse a URL query parameter into the typed `RankingPeriod` union.
 *
 * Invalid / missing values fall back to `undefined` so the caller can
 * apply the document default (`all_time`).
 */
function parsePeriod(value: string | null | undefined): RankingPeriod | undefined {
  if (value === "weekly" || value === "monthly" || value === "all_time") {
    return value;
  }
  return undefined;
}

interface PeriodChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function PeriodChip({ label, active, onClick }: PeriodChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={`rankings-period-${label.toLowerCase()}`}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Period filter row. URL-backed.
 *
 * Renders three pill buttons (Weekly / Monthly / All time) and writes
 * the chosen period to the URL query state via `router.replace`. The
 * active state is sourced from the URL so a deep-link renders the
 * correct period without flicker.
 */
function PeriodFilter({
  period,
  onChange,
}: {
  period: RankingPeriod;
  onChange: (next: RankingPeriod) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Leaderboard period"
      data-testid="rankings-period-filter"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        <Filter aria-hidden="true" className="h-3.5 w-3.5" />
        Period
      </span>
      <PeriodChip
        label="Weekly"
        active={period === "weekly"}
        onClick={() => onChange("weekly")}
      />
      <PeriodChip
        label="Monthly"
        active={period === "monthly"}
        onClick={() => onChange("monthly")}
      />
      <PeriodChip
        label="All time"
        active={period === "all_time"}
        onClick={() => onChange("all_time")}
      />
    </div>
  );
}

/**
 * Inner client component that owns the URL ↔ period state binding.
 *
 * Pulled out of the default export so `useSearchParams` runs inside
 * a `<Suspense>` boundary (Next.js requirement for client components
 * that read search params on a server-prerendered route).
 */
function RankingsPageInner({ className }: RankingsPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const period = useMemo<RankingPeriod>(() => {
    return parsePeriod(searchParams.get(QUERY_PERIOD)) ?? DEFAULT_PERIOD;
  }, [searchParams]);

  const setPeriod = useCallback(
    (next: RankingPeriod) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (next === DEFAULT_PERIOD) {
        params.delete(QUERY_PERIOD);
      } else {
        params.set(QUERY_PERIOD, next);
      }
      const qs = params.toString();
      router.replace(qs.length > 0 ? `${pathname}?${qs}` : pathname, {
        scroll: false,
      });
    },
    [searchParams, router, pathname],
  );

  return (
    <main
      data-testid="rankings-page"
      className={`mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
        <p className="text-sm text-muted-foreground">
          Your personal rank, milestones, and the global leaderboard.
        </p>
      </header>

      <RankingSummaryCard />
      <MilestonesList />
      <PeriodFilter period={period} onChange={setPeriod} />
      <LeaderboardTable period={period} />
      <RankingHistory />
    </main>
  );
}

/**
 * Render the Story 5.5 rankings page composition.
 *
 * Honours TKT-5.5.F1:
 *
 *   - F1 AC #1 — renders a placeholder view when
 *     `rankings_live === 'placeholder'`.
 *   - F1 AC #2 — personal surfaces self-gate on auth bootstrap.
 *   - F1 AC #3 — public leaderboard visible to all visitors.
 *   - F1 AC #4 — period filter writes to URL query state.
 *   - F1 AC #5 — ties render in backend order (the
 *     `LeaderboardTable` component owns this contract).
 *   - F1 AC #6 — the freshness indicator on
 *     `RankingSummaryCard` is rendered during revalidation (the
 *     `ConsistencyNotice` primitive owns this contract).
 */
export function RankingsPage({ className }: RankingsPageProps) {
  const isLive = isRankingSurfaceEnabled();

  if (!isLive) {
    return (
      <main
        data-testid="rankings-page-placeholder"
        className={`mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
      >
        <RankingsPlaceholder />
      </main>
    );
  }

  return (
    <Suspense fallback={null}>
      <RankingsPageInner className={className} />
    </Suspense>
  );
}
