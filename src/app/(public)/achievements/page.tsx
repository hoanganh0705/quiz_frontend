import { buildMetadata } from "@/shared/lib/seo";

import { AchievementsPage } from "@/features/achievements/components/AchievementsPage";

export const metadata = buildMetadata({
  title: "Achievements | QuizHub",
  description:
    "Browse the badge catalog, your earned badges, and your full achievement history.",
  path: "/achievements",
});

export default function AchievementsRoute(): React.ReactElement {
  return <AchievementsPage />;
}
