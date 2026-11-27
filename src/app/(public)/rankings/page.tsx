import { buildMetadata } from "@/shared/lib/seo";

import { RankingsPage } from "@/features/rankings/components/RankingsPage";

export const metadata = buildMetadata({
  title: "Rankings | QuizHub",
  description:
    "Track your personal rank, milestones, and the global quiz leaderboard.",
  path: "/rankings",
});

export default function RankingsRoute(): React.ReactElement {
  return <RankingsPage />;
}
