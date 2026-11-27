import { siteConfig } from "@/shared/lib/seo";

import { QuizDetailPage } from "@/features/quizzes";
import { projectQuizToPlayerView } from "@/features/quizzes/lib";
import { getQuizByIdOrSlugCached } from "@/features/quizzes/services/quiz-ssr";

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function absoluteImageUrl(imageUrl: string | null): string | undefined {
  if (!imageUrl) return undefined;
  try {
    return new URL(imageUrl, siteConfig.url).toString();
  } catch {
    return undefined;
  }
}

function toIsoDuration(durationMs: number | undefined): string | undefined {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return undefined;
  }
  return `PT${Math.max(1, Math.round(durationMs / 1000))}S`;
}

export default async function QuizDetailRoute({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;

  let jsonLd: string | null = null;
  try {
    const dto = await getQuizByIdOrSlugCached(idOrSlug);
    if (dto) {
      const quiz = projectQuizToPlayerView(dto);
      const publishedVersion = quiz.publishedVersion;
      jsonLd = safeJsonLd({
        "@context": "https://schema.org",
        "@type": "Quiz",
        name: quiz.title,
        description: quiz.description ?? undefined,
        educationalLevel: publishedVersion?.difficulty,
        timeRequired: toIsoDuration(publishedVersion?.durationMs),
        numberOfQuestions: publishedVersion?.questions.length ?? 0,
        isAccessibleForFree: true,
        url: new URL(
          `/quizzes/${quiz.slug || idOrSlug}`,
          siteConfig.url,
        ).toString(),
        image: absoluteImageUrl(quiz.imageUrl),
      });
    }
  } catch {
    jsonLd = null;
  }

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      ) : null}
      <QuizDetailPage idOrSlug={idOrSlug} />
    </>
  );
}
