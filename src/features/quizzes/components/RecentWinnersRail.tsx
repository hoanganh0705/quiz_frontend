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
      className="mb-10 rounded-xl border border-border bg-main p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          Recent winners
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