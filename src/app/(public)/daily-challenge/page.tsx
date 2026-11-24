import { memo } from "react";
import { DailyChallengeMainContent } from "@/features/daily-challenge";

const DailyChallenge = memo(function DailyChallenge() {
  return (
    <div className="min-h-screen text-foreground p-4 md:p-8 lg:p-12">
      <header className="space-y-1.5 mb-6">
        <h1 className="text-2xl text-foreground md:text-3xl font-bold tracking-tight">
          Daily Challenge
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Test your knowledge, keep your streak alive, and climb the leaderboard every day.
        </p>
      </header>

      <DailyChallengeMainContent />
    </div>
  );
});

export default DailyChallenge;
