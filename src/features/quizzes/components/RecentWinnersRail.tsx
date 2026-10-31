import { Sparkles } from "lucide-react";
import type { RecentWinnersResponseDto } from "@/lib/api/generated/schemas";

interface RecentWinnersRailProps {
  data: RecentWinnersResponseDto | null | undefined;
}

export function RecentWinnersRail({
  data,
}: RecentWinnersRailProps): React.ReactElement | null {
  const winners = data?.winners ?? [];

  if (winners.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Recent winners"
      className="rounded-2xl border border-border/70 bg-gradient-to-b from-card/80 to-card/40 p-4 sm:p-6 backdrop-blur-sm shadow-xs"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand border border-brand/20">
          <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Recent Winners
        </h2>
      </div>
      <ul
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="recent-winners-rail"
      >
        {winners.slice(0, 6).map((winner) => (
          <li
            key={winner.userId + winner.wonAt}
            className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
            data-testid="recent-winners-item"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {winner.username}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {winner.quizTitle}
              </p>
              <p className="mt-1 text-xs text-foreground-secondary">
                {winner.amountWon} · {winner.timeAgo}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}