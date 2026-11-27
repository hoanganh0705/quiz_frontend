import { QuizAdminPage } from "@/features/admin/quiz-admin/components/QuizAdminPage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quizzes",
  description: "Review, moderate, and manage quizzes across the platform.",
};

export default function AdminQuizzesPage() {
  return <QuizAdminPage />;
}
