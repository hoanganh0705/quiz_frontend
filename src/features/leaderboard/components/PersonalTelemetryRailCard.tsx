"use client";

import Link from "next/link";
import { memo, useCallback, useRef, useState } from "react";

import {
  Award,
  CheckCircle2,
  ChevronRight,
  Compass,
  Lock,
  LogIn,
  Minus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import {
  useMyPercentile,
  useMyRankMovement,
  useMyRankingHistory,
  useMyRankingMilestones,
} from "@/features/leaderboard/hooks/useMyRankInsights";
import {
  getBadges,
  getPeakRanks,
  getPositionForPeriod,
  useMyRanking,
} from "@/features/leaderboard/hooks/useMyRanking";
import { useNearbyRanks } from "@/features/leaderboard/hooks/useNearbyRanks";
import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

import { cn } from "@/shared/utils/merge-class-names";

import { RankSparklineChart } from "./RankSparklineChart";

import type { SelectedPlayerPreview } from "@/features/leaderboard/hooks/usePlayerDossier";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

export interface PersonalTelemetryRailCardProps {
  readonly period: LeaderboardPeriod;
  readonly onSelectPlayer?: (player: SelectedPlayerPreview) => void;
}

type TelemetryTab = "rivals" | "trajectory" | "milestones";

const TELEMETRY_TABS: ReadonlyArray<{ id: TelemetryTab; label: string }> = [
  { id: "rivals", label: "Rivals" },
  { id: "trajectory", label: "Trajectory" },
  { id: "milestones", label: "Milestones" },
];

const PERIOD_STANDING_LABEL: Readonly<Record<LeaderboardPeriod, string>> = {
  weekly: "Your weekly standing",
  monthly: "Your monthly standing",
  all_time: "Your all-time standing",
};

const MILESTONE_LADDER: ReadonlyArray<{
  key: string;
  label: string;
  threshold: number;
}> = [
  { key: "TOP_10000", label: "Top 10,000", threshold: 10000 },
  { key: "TOP_1000", label: "Top 1,000", threshold: 1000 },
  { key: "TOP_100", label: "Top 100", threshold: 100 },
  { key: "TOP_50", label: "Top 50", threshold: 50 },
  { key: "TOP_10", label: "Top 10", threshold: 10 },
  { key: "TOP_3", label: "Top 3 Podium", threshold: 3 },
  { key: "TOP_1", label: "#1 Champion", threshold: 1 },
];

function extractIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.iso === "string") return record.iso;
    if (typeof record.value === "string") return record.value;
    if (typeof record.date === "string") return record.date;
  }
  return null;
}

export const PersonalTelemetryRailCard = memo(
  function PersonalTelemetryRailCard({
    period,
    onSelectPlayer,
  }: PersonalTelemetryRailCardProps) {
    const [activeTab, setActiveTab] = useState<TelemetryTab>("rivals");
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const { isAuthenticated } = useAuthState();
    const { data: myRanking, isLoading: isMyRankingLoading } = useMyRanking();
    const { data: percentileData } = useMyPercentile(period, isAuthenticated);
    const { data: movementData } = useMyRankMovement(period, isAuthenticated);

    const nearby = useNearbyRanks(
      period,
      2,
      isAuthenticated && activeTab === "rivals",
    );
    const historyQuery = useMyRankingHistory(
      period,
      isAuthenticated && activeTab === "trajectory",
    );
    const milestonesQuery = useMyRankingMilestones(
      isAuthenticated && activeTab === "milestones",
    );

    const handleTabKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const next = (index + 1) % TELEMETRY_TABS.length;
          setActiveTab(TELEMETRY_TABS[next]!.id);
          tabRefs.current[next]?.focus();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          const prev =
            (index - 1 + TELEMETRY_TABS.length) % TELEMETRY_TABS.length;
          setActiveTab(TELEMETRY_TABS[prev]!.id);
          tabRefs.current[prev]?.focus();
        } else if (e.key === "Home") {
          e.preventDefault();
          setActiveTab(TELEMETRY_TABS[0]!.id);
          tabRefs.current[0]?.focus();
        } else if (e.key === "End") {
          e.preventDefault();
          const last = TELEMETRY_TABS.length - 1;
          setActiveTab(TELEMETRY_TABS[last]!.id);
          tabRefs.current[last]?.focus();
        }
      },
      [],
    );

    if (!isAuthenticated) {
      return (
        <section
          aria-label="Personal ranking telemetry"
          className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4"
        >
          <div className="space-y-1.5">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Track Your Standing
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Sign in to see your live rank, rival radar, daily rank trajectory,
              and career milestones.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
              <Target
                className="h-4 w-4 text-brand"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-foreground">
                Rivals Radar
              </p>
              <p className="text-xs text-muted-foreground">
                Exact XP needed to overtake the player ahead
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
              <Award
                className="h-4 w-4 text-amber-500"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-foreground">
                Rank Milestones
              </p>
              <p className="text-xs text-muted-foreground">
                Unlock Top 100, Top 10, and Podium records
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-default hover:bg-default-hover text-default-foreground"
              asChild
            >
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in to rank
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/quizzes">
                <Compass className="h-4 w-4" aria-hidden="true" />
                Browse quizzes
              </Link>
            </Button>
          </div>
        </section>
      );
    }

    const position = getPositionForPeriod(myRanking, period);
    const badges = getBadges(myRanking);
    const peakRanks = getPeakRanks(myRanking);

    const userRank = position?.rank ?? null;
    const userXp = position?.xp ?? 0;
    const xpToNext = position?.xpToNextRank ?? null;
    const nextRankXp = position?.nextRankXp ?? null;

    const progressPercent =
      userRank === 1 && xpToNext === null
        ? 100
        : xpToNext !== null && nextRankXp !== null && nextRankXp > 0
          ? Math.min(100, Math.max(0, Math.round((userXp / nextRankXp) * 100)))
          : 0;

    const movementDirection =
      movementData?.direction ??
      (position?.trend === "up"
        ? "up"
        : position?.trend === "down"
          ? "down"
          : position?.trend === "new"
            ? "new"
            : "same");
    const movementAmount =
      movementData?.change !== null && movementData?.change !== undefined
        ? Math.abs(movementData.change)
        : (position?.trendAmount ?? null);

    const percentileLabel =
      percentileData?.percentileLabel ?? position?.percentileLabel ?? null;
    const betterThanUsers = percentileData?.betterThanUsers ?? null;

    const statusBadge = badges?.isRisingStar
      ? "Rising Star"
      : badges?.isNew
        ? "New Player"
        : badges?.isActive
          ? "Active"
          : null;

    return (
      <section
        aria-label="Personal ranking telemetry"
        data-testid="leaderboard-personal-standing"
        className="rounded-xl border border-border bg-card overflow-hidden shadow-xs"
      >
        <div className="border-b border-border/70 bg-brand/5 p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {PERIOD_STANDING_LABEL[period]}
                </h2>
                {statusBadge ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    {badges?.isRisingStar ? (
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                    ) : null}
                    {statusBadge}
                  </span>
                ) : null}
              </div>

              {isMyRankingLoading && !myRanking ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
                  <span
                    className={cn(
                      "font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none",
                      userRank !== null
                        ? getRankColor(userRank)
                        : "text-muted-foreground",
                    )}
                  >
                    {userRank !== null ? `#${userRank}` : "Unranked"}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {userXp.toLocaleString()} XP
                  </span>
                </div>
              )}
            </div>

            {userRank !== null ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0",
                  movementDirection === "up"
                    ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : movementDirection === "down"
                      ? "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300"
                      : movementDirection === "new"
                        ? "border-brand/30 bg-brand/12 text-brand"
                        : "border-border bg-muted/60 text-muted-foreground",
                )}
              >
                {movementDirection === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : movementDirection === "down" ? (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span className="font-mono tabular-nums">
                  {movementDirection === "up"
                    ? movementAmount
                      ? `+${movementAmount}`
                      : "Up"
                    : movementDirection === "down"
                      ? movementAmount
                        ? `-${movementAmount}`
                        : "Down"
                      : movementDirection === "new"
                        ? "New"
                        : "Steady"}
                </span>
              </div>
            ) : null}
          </div>

          {percentileLabel || betterThanUsers !== null ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {percentileLabel ? (
                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-mono font-semibold tabular-nums text-foreground">
                  {percentileLabel}
                </span>
              ) : null}
              {betterThanUsers !== null && betterThanUsers > 0 ? (
                <span>
                  Ahead of{" "}
                  <strong className="font-mono font-semibold tabular-nums text-foreground">
                    {betterThanUsers.toLocaleString()}
                  </strong>{" "}
                  players
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums text-muted-foreground">
              <span>
                {userRank === null
                  ? "Play a quiz to place"
                  : xpToNext !== null
                    ? `${xpToNext.toLocaleString()} XP to next rank`
                    : "#1 — Leading the pack"}
              </span>
              {userRank !== null ? <span>{progressPercent}%</span> : null}
            </div>

            {userRank !== null ? (
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress to next rank"
                className="h-2 w-full overflow-hidden rounded-full bg-border/60"
              >
                <svg
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  className="block h-full w-full"
                  aria-hidden="true"
                >
                  <rect
                    x="0"
                    y="0"
                    width={progressPercent}
                    height="8"
                    className="fill-brand transition-all duration-200 ease-out motion-reduce:transition-none"
                  />
                </svg>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div
            role="tablist"
            aria-label="Personal telemetry views"
            className="grid grid-cols-3 gap-1 rounded-md border border-border/70 bg-muted/60 p-1"
          >
            {TELEMETRY_TABS.map((tab, index) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`telemetry-tab-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`telemetry-panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={cn(
                    "h-8 rounded-md px-2 text-xs font-medium transition-colors duration-150 cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    isSelected
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`telemetry-panel-${activeTab}`}
            aria-labelledby={`telemetry-tab-${activeTab}`}
            tabIndex={0}
            className="focus:outline-none"
          >
            {activeTab === "rivals" ? (
              <RivalsLadderPanel
                above={nearby.above}
                me={nearby.me}
                below={nearby.below}
                isLoading={nearby.isLoading}
                fallbackRank={userRank}
                fallbackXp={userXp}
                onSelectPlayer={onSelectPlayer}
              />
            ) : null}

            {activeTab === "trajectory" ? (
              <div className="space-y-3.5">
                {historyQuery.isLoading ? (
                  <Skeleton className="h-32 w-full rounded-lg" />
                ) : (
                  <RankSparklineChart
                    points={historyQuery.history}
                    ariaLabel="Your rank progression"
                  />
                )}

                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Daily best",
                      rank: peakRanks?.daily?.rank ?? null,
                      date: extractIsoDate(peakRanks?.daily?.achievedAt),
                    },
                    {
                      label: "Weekly best",
                      rank: peakRanks?.weekly?.rank ?? null,
                      date: extractIsoDate(peakRanks?.weekly?.achievedAt),
                    },
                    {
                      label: "Monthly best",
                      rank: peakRanks?.monthly?.rank ?? null,
                      date: extractIsoDate(peakRanks?.monthly?.achievedAt),
                    },
                    {
                      label: "All-time best",
                      rank: peakRanks?.allTime?.rank ?? null,
                      date: extractIsoDate(peakRanks?.allTime?.achievedAt),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5"
                    >
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 font-mono text-base font-bold tabular-nums",
                          item.rank !== null
                            ? getRankColor(item.rank)
                            : "text-muted-foreground",
                        )}
                      >
                        {item.rank !== null ? `#${item.rank}` : "—"}
                      </p>
                      {item.date ? (
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "milestones" ? (
              <MilestonesPanel
                milestones={milestonesQuery.milestones}
                isLoading={milestonesQuery.isLoading}
              />
            ) : null}
          </div>
        </div>
      </section>
    );
  },
);

interface RivalsLadderPanelProps {
  readonly above: ReturnType<typeof useNearbyRanks>["above"];
  readonly me: ReturnType<typeof useNearbyRanks>["me"];
  readonly below: ReturnType<typeof useNearbyRanks>["below"];
  readonly isLoading: boolean;
  readonly fallbackRank: number | null;
  readonly fallbackXp: number;
  readonly onSelectPlayer?: (player: SelectedPlayerPreview) => void;
}

function RivalsLadderPanel({
  above,
  me,
  below,
  isLoading,
  fallbackRank,
  fallbackXp,
  onSelectPlayer,
}: RivalsLadderPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const myXp = me?.xp ?? fallbackXp;
  const hasAnySlice = above.length > 0 || me !== null || below.length > 0;

  if (!hasAnySlice && fallbackRank === null) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/25 px-3.5 py-5 text-center space-y-2">
        <p className="text-xs font-semibold text-foreground">
          No nearby rivals yet
        </p>
        <p className="text-xs text-muted-foreground">
          Complete a quiz in this period to lock onto adjacent players.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/quizzes">Play a quiz</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground pb-1">
        Players directly ahead and chasing your spot
      </p>

      <ul className="divide-y divide-border/50 rounded-lg border border-border/70 bg-muted/15 overflow-hidden list-none">
        {above.map((rival) => {
          const gap = Math.max(1, rival.xp - myXp + 1);
          return (
            <li key={`above-${rival.userId}`}>
              <button
                type="button"
                onClick={() =>
                  onSelectPlayer?.({
                    userId: rival.userId,
                    displayName: rival.username,
                    username: rival.username,
                    rank: rival.rank,
                    xp: rival.xp,
                  })
                }
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "w-9 shrink-0 font-mono text-xs font-bold tabular-nums text-right",
                      getRankColor(rival.rank),
                    )}
                  >
                    #{rival.rank}
                  </span>
                  <span className="truncate text-xs sm:text-sm font-medium text-foreground">
                    {rival.username}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-amber-700 dark:text-amber-300">
                    +{gap.toLocaleString()} XP
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </button>
            </li>
          );
        })}

        {me !== null || fallbackRank !== null ? (
          <li className="flex items-center justify-between gap-2 bg-brand/10 px-3 py-2.5 ring-1 ring-inset ring-brand/35">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 shrink-0 font-mono text-xs font-bold tabular-nums text-right text-brand">
                #{me?.rank ?? fallbackRank}
              </span>
              <span className="truncate text-xs sm:text-sm font-bold text-foreground">
                {me?.username ?? "You"}
              </span>
              <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-xs font-semibold text-brand">
                You
              </span>
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-brand shrink-0">
              {myXp.toLocaleString()} XP
            </span>
          </li>
        ) : null}

        {below.map((rival) => {
          const cushion = Math.max(0, myXp - rival.xp);
          return (
            <li key={`below-${rival.userId}`}>
              <button
                type="button"
                onClick={() =>
                  onSelectPlayer?.({
                    userId: rival.userId,
                    displayName: rival.username,
                    username: rival.username,
                    rank: rival.rank,
                    xp: rival.xp,
                  })
                }
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "w-9 shrink-0 font-mono text-xs font-bold tabular-nums text-right",
                      getRankColor(rival.rank),
                    )}
                  >
                    #{rival.rank}
                  </span>
                  <span className="truncate text-xs sm:text-sm font-medium text-foreground">
                    {rival.username}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    -{cushion.toLocaleString()} XP
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface MilestonesPanelProps {
  readonly milestones: ReturnType<typeof useMyRankingMilestones>["milestones"];
  readonly isLoading: boolean;
}

function MilestonesPanel({ milestones, isLoading }: MilestonesPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const earnedMap = new Map(milestones.map((m) => [m.milestone, m]));

  return (
    <ul className="divide-y divide-border/50 rounded-lg border border-border/70 bg-muted/15 overflow-hidden list-none">
      {MILESTONE_LADDER.map((tier) => {
        const unlocked = earnedMap.get(tier.key);
        return (
          <li
            key={tier.key}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2.5",
              unlocked ? "bg-card" : "opacity-70",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {unlocked ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <Lock
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "text-xs sm:text-sm truncate",
                  unlocked
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {tier.label}
              </span>
            </div>

            {unlocked ? (
              <span className="font-mono text-xs tabular-nums text-emerald-700 dark:text-emerald-300 shrink-0">
                {unlocked.achievedAt
                  ? new Date(unlocked.achievedAt).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                      },
                    )
                  : `Reached #${unlocked.rank}`}
              </span>
            ) : (
              <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                Reach #{tier.threshold.toLocaleString()}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
