import { FriendsHubPage } from "@/features/social/pages/FriendsHubPage";

import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Friends & Social | QuizHub",
  description:
    "Connect with friends, manage friend requests, challenge players to quizzes, and compare head-to-head stats.",
  path: "/friends",
  noIndex: true,
});

export default function FriendsRoute(): React.ReactElement {
  return <FriendsHubPage />;
}
