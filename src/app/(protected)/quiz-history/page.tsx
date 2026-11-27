import { Suspense } from "react";

import { QuizHistoryPage } from "@/features/attempts";

import { buildMetadata } from "@/shared/lib/seo";

import QuizHistoryLoading from "./loading";

export const metadata = buildMetadata({
  title: "Quiz History | QuizHub",
  description: "Review your past quiz attempts, scores, and progress.",
  path: "/quiz-history",
  noIndex: true,
});

export default function Route() {
  return (
    <Suspense fallback={<QuizHistoryLoading />}>
      <QuizHistoryPage />
    </Suspense>
  );
}
