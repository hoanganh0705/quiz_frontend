import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildMetadata } from "@/shared/lib/seo";

import { projectQuizToPlayerView } from "@/features/quizzes/lib";
import { getQuizByIdOrSlugCached } from "@/features/quizzes/services/quiz-ssr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}): Promise<Metadata> {
  const { idOrSlug } = await params;
  try {
    const dto = await getQuizByIdOrSlugCached(idOrSlug);
    if (!dto) {
      throw new Error("quiz detail missing");
    }
    const quiz = projectQuizToPlayerView(dto);
    return buildMetadata({
      title: `${quiz.title} | QuizHub`,
      description:
        quiz.description ?? "View quiz details, questions, and statistics.",
      path: `/quizzes/${quiz.slug || idOrSlug}`,
    });
  } catch {
    return buildMetadata({
      title: "Quiz Details | QuizHub",
      description: "View quiz details, questions, and statistics.",
      path: `/quizzes/${idOrSlug}`,
    });
  }
}

export default function QuizDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
