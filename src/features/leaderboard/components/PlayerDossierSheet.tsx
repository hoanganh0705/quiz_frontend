"use client";

import Link from "next/link";
import { memo } from "react";

import {
  ArrowUpRight,
  Calendar,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { usePlayerDossier } from "@/features/leaderboard/hooks/usePlayerDossier";
import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";

import { cn } from "@/shared/utils/merge-class-names";

import { RankSparklineChart } from "./RankSparklineChart";

import type { SelectedPlayerPreview } from "@/features/leaderboard/hooks/usePlayerDossier";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

export interface PlayerDossierSheetProps {
  readonly player: SelectedPlayerPreview | null;
  readonly period: LeaderboardPeriod;
  readonly onClose: () => void;
}

function extractIsoTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.iso === "string") return obj.iso;
    if (typeof obj.value === "string") return obj.value;
    if (typeof obj.date === "string") return obj.date;
  }
  return null;
}

export const PlayerDossierSheet = memo(function PlayerDossierSheet({
  player,
  period,
  onClose,
}: PlayerDossierSheetProps) {
  const { profileRank, history, resolvedUsername, isLoading } =
    usePlayerDossier(player, period);

  const isOpen = player !== null;
  const displayName = player?.displayName ?? resolvedUsername ?? "Player";
  const handle = player?.username ?? resolvedUsername ?? null;
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const weekly = profileRank?.global?.weekly ?? null;
  const monthly = profileRank?.global?.monthly ?? null;
  const allTime = profileRank?.global?.allTime ?? null;
  const peakRanks = profileRank?.peakRanks ?? null;
  const badges = profileRank?.badges ?? null;
  const lastActivity = extractIsoTimestamp(profileRank?.lastActivityAt);

  const activeStandingsRank =
    period === "weekly"
      ? (weekly?.rank ?? player?.rank ?? null)
      : period === "monthly"
        ? (monthly?.rank ?? player?.rank ?? null)
        : (allTime?.rank ?? player?.rank ?? null);

  const activeStandingsXp =
    period === "weekly"
      ? (weekly?.xp ?? player?.xp ?? null)
      : period === "monthly"
        ? (monthly?.xp ?? player?.xp ?? null)
        : (allTime?.xp ?? player?.xp ?? null);

  const profileHref = player?.isCurrentUser
    ? "/my-profile"
    : player?.userId
      ? `/users/${player.userId}`
      : "/leaderboard";

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-md border-border bg-card p-0 gap-0 overflow-y-auto"
        data-testid="player-dossier-sheet"
      >
        <SheetHeader className="border-b border-border/70 bg-brand/5 px-5 pt-6 pb-5 space-y-4">
          <div className="flex items-start gap-3.5 pr-6">
            <Avatar className="h-14 w-14 shrink-0 border-2 border-brand/40 bg-muted shadow-xs">
              {player?.avatarUrl ? (
                <AvatarImage src={player.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-base font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <SheetTitle className="text-lg font-bold tracking-tight text-foreground truncate">
                  {displayName}
                </SheetTitle>
                {player?.isCurrentUser ? (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                    You
                  </span>
                ) : null}
              </div>

              <SheetDescription className="text-xs text-muted-foreground">
                {handle
                  ? `@${handle} · Competitive ranking dossier`
                  : "Competitive ranking dossier"}
              </SheetDescription>

              {badges ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {badges.isRisingStar ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      Rising Star
                    </span>
                  ) : null}
                  {badges.isActive ? (
                    <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Active
                    </span>
                  ) : null}
                  {badges.isNew ? (
                    <span className="rounded-full border border-brand/35 bg-brand/12 px-2 py-0.5 text-xs font-medium text-brand">
                      New Player
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/90 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {period === "weekly"
                  ? "Weekly Rank"
                  : period === "monthly"
                    ? "Monthly Rank"
                    : "All-Time Rank"}
              </p>
              <p
                className={cn(
                  "font-mono text-2xl font-bold tabular-nums",
                  activeStandingsRank !== null
                    ? getRankColor(activeStandingsRank)
                    : "text-muted-foreground",
                )}
              >
                {activeStandingsRank !== null
                  ? `#${activeStandingsRank.toLocaleString()}`
                  : "Unranked"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Earned XP</p>
              <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                {activeStandingsXp !== null
                  ? `${activeStandingsXp.toLocaleString()} XP`
                  : "—"}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="p-5 space-y-5 flex-1">
          {isLoading ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Global Standings by Season
                </h3>
                <div className="grid grid-cols-3 divide-x divide-border/70 rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
                  {[
                    { label: "Weekly", pos: weekly },
                    { label: "Monthly", pos: monthly },
                    { label: "All-Time", pos: allTime },
                  ].map(({ label, pos }) => (
                    <div
                      key={label}
                      className="px-2.5 py-3 text-center space-y-1"
                    >
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p
                        className={cn(
                          "font-mono text-lg font-bold tabular-nums",
                          pos?.rank !== undefined && pos?.rank !== null
                            ? getRankColor(Number(pos.rank))
                            : "text-muted-foreground",
                        )}
                      >
                        {pos?.rank !== undefined && pos?.rank !== null
                          ? `#${Number(pos.rank)}`
                          : "—"}
                      </p>
                      <p className="font-mono text-xs tabular-nums text-foreground font-medium">
                        {pos?.xp !== undefined && pos?.xp !== null
                          ? `${Number(pos.xp).toLocaleString()} XP`
                          : "—"}
                      </p>
                      {pos?.trend === "up" && pos.trendAmount ? (
                        <p className="inline-flex items-center justify-center gap-0.5 font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                          <TrendingUp
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          +{pos.trendAmount}
                        </p>
                      ) : pos?.trend === "down" && pos.trendAmount ? (
                        <p className="inline-flex items-center justify-center gap-0.5 font-mono text-xs tabular-nums text-rose-600 dark:text-rose-400">
                          <TrendingDown
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          -{pos.trendAmount}
                        </p>
                      ) : pos?.percentileLabel ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {pos.percentileLabel}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Rank Trajectory
                </h3>
                <RankSparklineChart
                  points={history}
                  ariaLabel={`${displayName} rank progression`}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Career Peak Finishes
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Daily best",
                      rank: peakRanks?.daily?.rank ?? null,
                      date: extractIsoTimestamp(peakRanks?.daily?.achievedAt),
                    },
                    {
                      label: "Weekly best",
                      rank: peakRanks?.weekly?.rank ?? null,
                      date: extractIsoTimestamp(peakRanks?.weekly?.achievedAt),
                    },
                    {
                      label: "Monthly best",
                      rank: peakRanks?.monthly?.rank ?? null,
                      date: extractIsoTimestamp(peakRanks?.monthly?.achievedAt),
                    },
                    {
                      label: "All-time best",
                      rank: peakRanks?.allTime?.rank ?? null,
                      date: extractIsoTimestamp(peakRanks?.allTime?.achievedAt),
                    },
                  ].map((peak) => (
                    <div
                      key={peak.label}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Target
                            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium text-foreground truncate">
                            {peak.label}
                          </span>
                        </div>
                        {peak.date ? (
                          <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                            {new Date(peak.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "font-mono text-sm font-bold tabular-nums shrink-0",
                          peak.rank !== null
                            ? getRankColor(Number(peak.rank))
                            : "text-muted-foreground",
                        )}
                      >
                        {peak.rank !== null ? `#${Number(peak.rank)}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {lastActivity ? (
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-3.5 py-2.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Last ranked activity
                  </span>
                  <span className="font-mono tabular-nums text-foreground font-medium">
                    {new Date(lastActivity).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>

        <SheetFooter className="border-t border-border/70 bg-muted/20 px-5 py-4">
          <Button
            className="w-full bg-default hover:bg-default-hover text-default-foreground"
            asChild
          >
            <Link href={profileHref} onClick={onClose}>
              View Public Profile
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
