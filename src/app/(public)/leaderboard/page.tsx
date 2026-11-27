import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { buildMetadata } from "@/shared/lib/seo";

import { LeaderboardArena } from "@/features/leaderboard";

export const metadata = buildMetadata({
  title: "Leaderboard | QuizHub",
  description: "See top players and track global quiz rankings.",
  path: "/leaderboard",
});

export default function LeaderboardRoutePage() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <LeaderboardArena />
    </div>
  );
}
