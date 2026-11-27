import { CreateQuizPage } from "@/features/quizzes/components/CreateQuizPage";

import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Create Quiz | QuizHub",
  description: "Author a new quiz, configure difficulty, and publish questions.",
  path: "/create-quiz",
  noIndex: true,
});

export default function CreateQuizRoutePage() {
  return <CreateQuizPage />;
}
