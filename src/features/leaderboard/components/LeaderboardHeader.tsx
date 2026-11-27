"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Clock, Globe, UserPlus, Users } from "lucide-react";

import { formatPeriodReset } from "@/features/leaderboard/lib/leaderboard-presentation";

import { Button } from "@/components/ui/Button";

import { cn } from "@/shared/utils/merge-class-names";

import { LeaderboardPeriodSelector } from "./LeaderboardPeriodSelector";

import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

export type LeaderboardArenaScope = "global" | "friends";

export interface LeaderboardHeaderProps {
  period?: LeaderboardPeriod;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
  scope?: LeaderboardArenaScope;
  onScopeChange?: (scope: LeaderboardArenaScope) => void;
  totalParticipants?: number | null;
  resetInSeconds?: number | null;
  onOpenFindFriends?: () => void;
}

const ARENA_SCOPES: ReadonlyArray<{
  id: LeaderboardArenaScope;
  label: string;
}> = [
  { id: "global", label: "Global XP" },
  { id: "friends", label: "Friends" },
];

export const LeaderboardHeader = memo(function LeaderboardHeader({
  period = "weekly",
  onPeriodChange,
  scope = "global",
  onScopeChange,
  totalParticipants = null,
  resetInSeconds = null,
  onOpenFindFriends,
}: LeaderboardHeaderProps) {
  const scopeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [liveResetSeconds, setLiveResetSeconds] = useState<number | null>(
    resetInSeconds,
  );

  useEffect(() => {
    setLiveResetSeconds(resetInSeconds);
  }, [resetInSeconds]);

  useEffect(() => {
    if (
      period === "all_time" ||
      liveResetSeconds === null ||
      liveResetSeconds <= 0
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setLiveResetSeconds((prev) =>
        prev !== null && prev > 0 ? prev - 1 : prev,
      );
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [liveResetSeconds, period]);

  const handleScopeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!onScopeChange) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = (index + 1) % ARENA_SCOPES.length;
        onScopeChange(ARENA_SCOPES[next]!.id);
        scopeRefs.current[next]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (index - 1 + ARENA_SCOPES.length) % ARENA_SCOPES.length;
        onScopeChange(ARENA_SCOPES[prev]!.id);
        scopeRefs.current[prev]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        onScopeChange(ARENA_SCOPES[0]!.id);
        scopeRefs.current[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        const last = ARENA_SCOPES.length - 1;
        onScopeChange(ARENA_SCOPES[last]!.id);
        scopeRefs.current[last]?.focus();
      }
    },
    [onScopeChange],
  );

  const showResetBadge =
    period !== "all_time" &&
    liveResetSeconds !== null &&
    liveResetSeconds !== undefined;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Leaderboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Compete in quizzes, track rivals around your rank, and climb the
            seasonal XP standings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {totalParticipants !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-medium tabular-nums text-foreground shadow-2xs">
              <Users
                className="h-3.5 w-3.5 shrink-0 text-brand"
                aria-hidden="true"
              />
              {totalParticipants.toLocaleString()} players
            </span>
          ) : null}

          {showResetBadge ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs font-medium tabular-nums text-muted-foreground shadow-2xs">
              <Clock
                className="h-3.5 w-3.5 shrink-0 text-amber-500"
                aria-hidden="true"
              />
              Resets in {formatPeriodReset(liveResetSeconds)}
            </span>
          ) : null}
        </div>
      </header>

      {onScopeChange || onPeriodChange || onOpenFindFriends ? (
        <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between rounded-xl border border-border bg-card p-2 sm:p-2.5 shadow-2xs">
          {onScopeChange ? (
            <div
              role="tablist"
              aria-label="Leaderboard scope"
              className="inline-flex h-10 sm:h-9 items-center gap-1 rounded-md border border-border/70 bg-muted/60 p-1 w-full @2xl:w-auto"
            >
              {ARENA_SCOPES.map((item, index) => {
                const isSelected = scope === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      scopeRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`arena-scope-tab-${item.id}`}
                    aria-selected={isSelected}
                    aria-controls={`arena-scope-panel-${item.id}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => onScopeChange(item.id)}
                    onKeyDown={(e) => handleScopeKeyDown(e, index)}
                    className={cn(
                      "inline-flex flex-1 @2xl:flex-initial h-full items-center justify-center gap-1.5 rounded-md px-3.5 text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      isSelected
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.id === "global" ? (
                      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center justify-between @2xl:justify-end gap-2">
            {onOpenFindFriends ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenFindFriends}
                aria-label="Find friends on leaderboard"
                className="min-h-10 sm:min-h-9"
              >
                <UserPlus
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                Find Friends
              </Button>
            ) : null}

            {onPeriodChange ? (
              <LeaderboardPeriodSelector
                period={period}
                onChange={onPeriodChange}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});
