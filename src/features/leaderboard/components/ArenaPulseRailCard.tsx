"use client";

import { memo, useCallback, useRef, useState } from "react";

import {
  BarChart3,
  ChevronRight,
  Flame,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { useLeaderboardDistribution } from "@/features/leaderboard/hooks/useLeaderboardDistribution";
import { useLiveWinners } from "@/features/leaderboard/hooks/useLiveWinners";
import { useTopMovers } from "@/features/leaderboard/hooks/useTopMovers";
import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";

import { cn } from "@/shared/utils/merge-class-names";

import type { SelectedPlayerPreview } from "@/features/leaderboard/hooks/usePlayerDossier";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

export interface ArenaPulseRailCardProps {
  readonly period: LeaderboardPeriod;
  readonly currentUserRank?: number | null;
  readonly onSelectPlayer?: (player: SelectedPlayerPreview) => void;
}

type PulseTab = "climbers" | "pyramid" | "champions";

const PULSE_TABS: ReadonlyArray<{ id: PulseTab; label: string }> = [
  { id: "climbers", label: "Climbers" },
  { id: "pyramid", label: "Tier Pyramid" },
  { id: "champions", label: "Champions" },
];

function resolveMoversPeriod(period: LeaderboardPeriod): "weekly" | "monthly" {
  return period === "all_time" ? "monthly" : period;
}

function getBucketMaxRank(label: string): number | null {
  const digits = label.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export const ArenaPulseRailCard = memo(function ArenaPulseRailCard({
  period,
  currentUserRank = null,
  onSelectPlayer,
}: ArenaPulseRailCardProps) {
  const [activeTab, setActiveTab] = useState<PulseTab>("climbers");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moversPeriod = resolveMoversPeriod(period);
  const { movers, isLoading: isMoversLoading } = useTopMovers(moversPeriod);
  const distribution = useLeaderboardDistribution(
    period,
    activeTab === "pyramid",
  );
  const liveWinners = useLiveWinners(activeTab === "champions");

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = (index + 1) % PULSE_TABS.length;
        setActiveTab(PULSE_TABS[next]!.id);
        tabRefs.current[next]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (index - 1 + PULSE_TABS.length) % PULSE_TABS.length;
        setActiveTab(PULSE_TABS[prev]!.id);
        tabRefs.current[prev]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveTab(PULSE_TABS[0]!.id);
        tabRefs.current[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        const last = PULSE_TABS.length - 1;
        setActiveTab(PULSE_TABS[last]!.id);
        tabRefs.current[last]?.focus();
      }
    },
    [],
  );

  return (
    <section
      aria-label="Arena pulse"
      className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {activeTab === "climbers" ? (
            <Flame
              className="h-4 w-4 shrink-0 text-amber-500"
              aria-hidden="true"
            />
          ) : activeTab === "pyramid" ? (
            <BarChart3
              className="h-4 w-4 shrink-0 text-brand"
              aria-hidden="true"
            />
          ) : (
            <Trophy
              className="h-4 w-4 shrink-0 text-amber-500"
              aria-hidden="true"
            />
          )}
          <h2 className="text-base font-bold tracking-tight text-foreground truncate">
            Arena Pulse
          </h2>
        </div>

        {activeTab === "climbers" && period === "all_time" ? (
          <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground shrink-0">
            Monthly pace
          </span>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Arena pulse sections"
        className="grid grid-cols-3 gap-1 rounded-md border border-border/70 bg-muted/60 p-1"
      >
        {PULSE_TABS.map((tab, index) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`pulse-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`pulse-panel-${tab.id}`}
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
        id={`pulse-panel-${activeTab}`}
        aria-labelledby={`pulse-tab-${activeTab}`}
        tabIndex={0}
        className="focus:outline-none"
      >
        {activeTab === "climbers" ? (
          isMoversLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : movers.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/25 px-3.5 py-6 text-center">
              <p className="text-xs font-semibold text-foreground">
                No rank jumps recorded yet
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Climbers appear as players overtake ranks across snapshots.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 rounded-lg border border-border/70 bg-muted/15 overflow-hidden list-none">
              {movers.slice(0, 6).map((mover) => {
                const currentRank = Number(mover.currentRank);
                const previousRank = Number(mover.previousRank);
                const jump = Number(mover.change);
                return (
                  <li key={mover.userId}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPlayer?.({
                          userId: mover.userId,
                          displayName: mover.username,
                          username: mover.username,
                          rank: currentRank,
                        })
                      }
                      className="flex w-full items-center justify-between gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
                          {mover.username}
                        </p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          #{previousRank.toLocaleString()} →{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              getRankColor(currentRank),
                            )}
                          >
                            #{currentRank.toLocaleString()}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                          <TrendingUp
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          +{jump.toLocaleString()}
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
          )
        ) : null}

        {activeTab === "pyramid" ? (
          distribution.isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : distribution.buckets.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/25 px-3.5 py-6 text-center">
              <p className="text-xs font-semibold text-foreground">
                Distribution calibrating
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tier buckets populate once players earn XP in this period.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-0.5">
                <span>Active ranked field</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {distribution.totalUsers.toLocaleString()} players
                </span>
              </div>

              {distribution.buckets.map((bucket, idx) => {
                const maxRank = getBucketMaxRank(bucket.label);
                const prevMaxRank =
                  idx > 0
                    ? getBucketMaxRank(distribution.buckets[idx - 1]!.label)
                    : 0;
                const isUserBucket =
                  currentUserRank !== null &&
                  maxRank !== null &&
                  currentUserRank <= maxRank &&
                  currentUserRank > (prevMaxRank ?? 0);

                const ratio =
                  distribution.totalUsers > 0
                    ? Math.min(
                        100,
                        Math.max(
                          6,
                          Math.round(
                            (bucket.count / distribution.totalUsers) * 100,
                          ),
                        ),
                      )
                    : 6;

                return (
                  <div
                    key={bucket.label}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 space-y-1.5",
                      isUserBucket
                        ? "border-brand/45 bg-brand/8"
                        : "border-border/60 bg-muted/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">
                          {bucket.label}
                        </span>
                        {isUserBucket ? (
                          <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-xs font-semibold text-brand">
                            Your tier
                          </span>
                        ) : null}
                      </div>
                      <span className="font-mono font-semibold tabular-nums text-muted-foreground">
                        {bucket.count.toLocaleString()}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                      <svg
                        viewBox="0 0 100 6"
                        preserveAspectRatio="none"
                        className="block h-full w-full"
                        aria-hidden="true"
                      >
                        <rect
                          x="0"
                          y="0"
                          width={ratio}
                          height="6"
                          className={
                            isUserBucket
                              ? "fill-brand"
                              : "fill-muted-foreground/55"
                          }
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}

              {distribution.remainingUsers > 0 ? (
                <p className="pt-1 font-mono text-xs tabular-nums text-muted-foreground text-right">
                  +{distribution.remainingUsers.toLocaleString()} contenders
                  beyond Top 10,000
                </p>
              ) : null}
            </div>
          )
        ) : null}

        {activeTab === "champions" ? (
          liveWinners.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : liveWinners.winners.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/25 px-3.5 py-6 text-center">
              <p className="text-xs font-semibold text-foreground">
                No tournament finishes yet
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Completed tournament champions appear here automatically.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 rounded-lg border border-border/70 bg-muted/15 overflow-hidden list-none">
              {liveWinners.winners.slice(0, 6).map((winner, index) => {
                const display = winner.displayName ?? winner.username;
                const initial = display[0]?.toUpperCase() ?? "?";
                return (
                  <li key={`${winner.userId}-${winner.wonAt}-${index}`}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPlayer?.({
                          userId: winner.userId,
                          displayName: display,
                          username: winner.username,
                          avatarUrl: winner.avatarUrl,
                        })
                      }
                      className="flex w-full items-center justify-between gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar className="h-8 w-8 shrink-0 border border-amber-500/40">
                          {winner.avatarUrl ? (
                            <AvatarImage src={winner.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-xs font-semibold">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
                            {display}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {winner.quizTitle} · {winner.timeAgo}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                        +{winner.amountWon} XP
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </div>
    </section>
  );
});
