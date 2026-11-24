"use client";

import Image from "next/image";
import { Crown } from "lucide-react";

import type { LeaderboardEntryDto } from "@/lib/api/generated/schemas";

interface GlobalTabProps {
  users: readonly LeaderboardEntryDto[];
  isLoading: boolean;
}

export default function GlobalTab({ users, isLoading }: GlobalTabProps) {
  if (isLoading) return null;

  const top = users.slice(0, 3);
  const second = top[1];
  const first = top[0];
  const third = top[2];

  const xpValues = top.map((u) => u.xp);
  const topXp = xpValues.length > 0 ? Math.max(...xpValues) : 0;
  const avgXp =
    xpValues.length > 0
      ? Math.round(xpValues.reduce((a, b) => a + b, 0) / xpValues.length)
      : 0;
  const medianXp = computeMedian(xpValues);

  return (
    <div className="space-y-6 pb-2">
      <div className="relative pt-2">
        <div className="flex items-end justify-center gap-2.5 sm:gap-4 mb-4">
          {/* Second Place */}
          {second ? (
            <div className="flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-400/10 via-slate-400/5 to-transparent border border-slate-400/20 shadow-xs">
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-slate-400/60 ring-offset-2 ring-offset-card">
                  <Image
                    src={second.avatarUrl || "/placeholder.svg"}
                    alt={second.displayName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-400 text-slate-950 font-mono font-bold text-xs px-2 py-0.5 rounded-full shadow-xs">
                  #2
                </div>
              </div>
              <h3 className="text-foreground font-semibold text-xs sm:text-sm text-center truncate w-full mt-1">
                {second.displayName}
              </h3>
              <p className="text-muted-foreground text-xs font-mono tabular-nums mt-0.5">
                {second.xp.toLocaleString()} XP
              </p>
              {second.isTied ? (
                <span className="text-xs text-muted-foreground mt-1">
                  Tied
                </span>
              ) : null}
            </div>
          ) : null}

          {/* First Place */}
          {first ? (
            <div className="flex-1 max-w-[140px] sm:max-w-[180px] flex flex-col items-center p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 shadow-md -mt-4 sm:-mt-6 relative">
              <Crown
                className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-500/30 mb-1 filter drop-shadow-xs"
                aria-hidden="true"
              />
              <div className="relative mb-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-amber-500 ring-offset-2 ring-offset-card shadow-sm">
                  <Image
                    src={first.avatarUrl || "/placeholder.svg"}
                    alt={first.displayName}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                  #1
                </div>
              </div>
              <h3 className="text-foreground font-bold text-sm sm:text-base text-center truncate w-full mt-1">
                {first.displayName}
              </h3>
              <p className="text-amber-500 dark:text-amber-400 text-xs sm:text-sm font-mono font-semibold tabular-nums mt-0.5">
                {first.xp.toLocaleString()} XP
              </p>
              {first.isTied ? (
                <span className="text-xs text-muted-foreground mt-1">
                  Tied
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Third Place */}
          {third ? (
            <div className="flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-700/10 via-amber-700/5 to-transparent border border-amber-700/20 shadow-xs mt-2 sm:mt-4">
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-amber-700/60 ring-offset-2 ring-offset-card">
                  <Image
                    src={third.avatarUrl || "/placeholder.svg"}
                    alt={third.displayName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-700 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-full shadow-xs">
                  #3
                </div>
              </div>
              <h3 className="text-foreground font-semibold text-xs sm:text-sm text-center truncate w-full mt-1">
                {third.displayName}
              </h3>
              <p className="text-muted-foreground text-xs font-mono tabular-nums mt-0.5">
                {third.xp.toLocaleString()} XP
              </p>
              {third.isTied ? (
                <span className="text-xs text-muted-foreground mt-1">
                  Tied
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6">
          <div className="bg-card/60 border border-border/60 p-3 rounded-xl text-center shadow-2xs">
            <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
              {topXp.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Top XP</p>
          </div>
          <div className="bg-card/60 border border-border/60 p-3 rounded-xl text-center shadow-2xs">
            <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
              {avgXp.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg XP (top 3)</p>
          </div>
          <div className="bg-card/60 border border-border/60 p-3 rounded-xl text-center shadow-2xs">
            <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
              {medianXp.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Median XP</p>
          </div>
          <div className="bg-card/60 border border-border/60 p-3 rounded-xl text-center shadow-2xs">
            <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
              {top.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Podium Entries</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function computeMedian(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}
