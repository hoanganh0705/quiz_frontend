import { Suspense } from "react";

import { buildMetadata } from "@/shared/lib/seo";

import { QuizzesDirectoryPage } from "@/features/quizzes";

import QuizzesLoading from "./loading";

export const metadata = buildMetadata({
  title: "Explore Quizzes | QuizHub",
  description:
    "Browse and discover quizzes by topic, difficulty, and popularity.",
  path: "/quizzes",
});

export default function QuizzesPage() {
  return (
    <Suspense fallback={<QuizzesLoading />}>
      <QuizzesDirectoryPage />
    </Suspense>
  );
}
