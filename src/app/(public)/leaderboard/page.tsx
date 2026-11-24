import {
  GlobalLeaderboard,
  LeaderboardHighlights,
  CompetitionStats,
  LeaderboardHeader,
} from "@/features/leaderboard";

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <LeaderboardHeader />

      <section
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
        aria-label="Leaderboard statistics"
      >
        <CompetitionStats />
        <LeaderboardHighlights />
      </section>

      <GlobalLeaderboard />
    </div>
  );
}
