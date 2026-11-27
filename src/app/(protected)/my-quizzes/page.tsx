import { MyQuizzesDashboardPage } from "@/features/quizzes/components/MyQuizzesDashboardPage";

import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "My Quizzes | QuizHub",
  description: "Manage your draft and published quizzes and creator analytics.",
  path: "/my-quizzes",
  noIndex: true,
});

export default function MyQuizzesPage(): React.ReactElement {
  return <MyQuizzesDashboardPage />;
}
