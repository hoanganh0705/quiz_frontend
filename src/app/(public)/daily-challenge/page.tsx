import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { buildMetadata } from "@/shared/lib/seo";

import { DailyChallengeMainContent } from "@/features/daily-challenge";

export const metadata = buildMetadata({
  title: "Daily Challenge | QuizHub",
  description: "Take the daily quiz challenge and compare your performance.",
  path: "/daily-challenge",
});

export default function DailyChallengePage() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <header className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Daily Challenge
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Test your knowledge, keep your streak alive, and climb the leaderboard
          every day.
        </p>
      </header>

      <DailyChallengeMainContent />
    </div>
  );
}
