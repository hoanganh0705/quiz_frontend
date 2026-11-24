import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Trophy, Zap, Flame } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";
import type { Player } from "@/features/users/types";

function getRankBadge(rank: number) {
  if (rank === 1) {
    return {
      label: "#1",
      className: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    };
  }
  if (rank === 2) {
    return {
      label: "#2",
      className:
        "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    };
  }
  if (rank === 3) {
    return {
      label: "#3",
      className: "bg-amber-700/15 text-amber-600 dark:text-amber-500 border-amber-700/30",
    };
  }
  return {
    label: `#${rank}`,
    className: "bg-muted text-muted-foreground border-border",
  };
}

export function PlayerCard({
  id,
  name,
  rank,
  score,
  avatarUrl,
  levelString,
  streak,
}: Player) {
  const rankBadge = getRankBadge(rank);
  const profileHref = `/profile/${id || ""}`;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-card border border-border/70 text-foreground shadow-xs hover:shadow-md hover:border-brand/40 transition-all duration-200 h-full">
      {/* Top Banner with Rank Badge */}
      <div className="relative h-20 w-full bg-linear-to-br from-brand/15 via-brand/5 to-muted/20 p-3 flex items-start justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-mono font-bold tabular-nums shadow-2xs",
            rankBadge.className,
          )}
        >
          {rank <= 3 && <Trophy className="h-3 w-3" aria-hidden="true" />}
          <span>{rankBadge.label}</span>
        </span>

        {levelString && (
          <span className="rounded-full bg-background/80 backdrop-blur-xs border border-border px-2 py-0.5 text-xs font-medium text-foreground">
            {levelString}
          </span>
        )}
      </div>

      {/* Avatar & Player Info */}
      <div className="relative -mt-9 flex flex-col items-center px-4 pb-4">
        <Link href={profileHref} className="group-hover:scale-105 transition-transform">
          <Avatar className="h-16 w-16 border-3 border-background bg-muted shadow-sm">
            <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="font-semibold text-muted-foreground text-sm">
              {name
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join("") || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>

        <Link href={profileHref} className="mt-2 text-center group-hover:text-brand transition-colors">
          <h3 className="text-sm font-bold tracking-tight text-foreground truncate max-w-[160px]">
            {name}
          </h3>
        </Link>

        {/* Primary XP metric */}
        <div className="mt-3 w-full rounded-lg bg-muted/50 border border-border/60 p-2.5 flex items-center justify-around">
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-brand fill-brand" aria-hidden="true" />
              <span>Total XP</span>
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
              {(score ?? 0).toLocaleString()}
            </span>
          </div>

          {streak !== undefined && streak > 0 ? (
            <div className="flex flex-col items-center border-l border-border/60 pl-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-500 fill-amber-500" aria-hidden="true" />
                <span>Streak</span>
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
                {streak}d
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
