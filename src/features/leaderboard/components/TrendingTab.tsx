"use client";

/**
 * `TrendingTab` — top-movers list from the live wire shape.
 *
 * Renders `TopMoverDto[]` from `rankingControllerGetTopMovers()`. The
 * wire shape carries:
 *   - `userId`
 *   - `username` (the public, `@`-prefixed handle)
 *   - `currentRank`
 *   - `previousRank`
 *   - `change` (positive — the previous - current)
 *
 * Note that the API does NOT carry `avatarUrl`, `xp`, `badges`,
 * `streak`, `winRate`, `quizzesCompleted`, `isOnline`, or
 * `lastActive`. The previous mock tabs rendered all of those;
 * they're intentionally absent here. Display names for the movers
 * fall back to the `username` (since the wire only exposes the
 * public handle) — if a real display name is needed we'd have to
 * hit `/users/:id`, out of scope for this surface.
 *
 * @see `useTopMovers` for the read contract.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import type { TopMoverDto } from "@/lib/api/generated/schemas";

interface TrendingTabProps {
  users: readonly TopMoverDto[];
  isLoading: boolean;
}

export default function TrendingTab({ users, isLoading }: TrendingTabProps) {
  if (isLoading) return null;

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-500" aria-hidden="true" />
          <h3 className="text-foreground font-semibold">Trending This Week</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No movers yet — check back after the next ranking snapshot.
        </p>
      </div>
    );
  }

  const topChange = users.reduce((max, u) => Math.max(max, u.change), 0);
  const moversCount = users.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-500" aria-hidden="true" />
        <h3 className="text-foreground font-semibold">Trending This Week</h3>
      </div>
      <div className="space-y-2.5">
        {users.map((user) => (
          <div
            key={user.userId}
            className="flex items-center justify-between gap-3 p-3 bg-muted/40 border border-border/60 rounded-xl hover:bg-muted/70 transition-colors shadow-2xs"
          >
            <div className="min-w-0 flex-1">
              <h4 className="text-foreground font-semibold text-sm truncate">
                {user.username}
              </h4>
              <p className="text-muted-foreground text-xs font-mono tabular-nums mt-0.5">
                Rank #{user.currentRank} (was #{user.previousRank})
              </p>
            </div>
            <div className="shrink-0">
              <div
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-mono tabular-nums font-semibold border ${
                  user.change > 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : user.change < 0
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-muted text-muted-foreground border-border/60"
                }`}
              >
                {user.change > 0 ? (
                  <TrendingUp className="w-3 h-3" aria-hidden="true" />
                ) : user.change < 0 ? (
                  <TrendingDown className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <Minus className="w-3 h-3" aria-hidden="true" />
                )}
                <span>
                  {user.change > 0 ? `+${user.change}` : user.change.toString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-6">
        <div className="bg-muted/40 border border-border/60 p-3 sm:p-3.5 rounded-xl text-center">
          <div className="flex items-center justify-center mb-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
            +{topChange}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Biggest Gain</p>
        </div>
        <div className="bg-muted/40 border border-border/60 p-3 sm:p-3.5 rounded-xl text-center">
          <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
            {moversCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Movers This Week</p>
        </div>
        <div className="bg-muted/40 border border-border/60 p-3 sm:p-3.5 rounded-xl text-center">
          <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
            {Math.round(users.reduce((sum, u) => sum + u.change, 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Net Movement</p>
        </div>
      </div>
    </div>
  );
}
