import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getQuizByIdOrSlug } from '@/features/quizzes/services/quizzes.service';
import { projectQuizToPlayerView } from '@/features/quizzes/lib';
import { buildMetadata, siteConfig } from '@/shared/lib/seo';

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}): Promise<Metadata> {
  const { idOrSlug } = await params;
  try {
    const quiz = projectQuizToPlayerView(await getQuizByIdOrSlug(idOrSlug));
    return buildMetadata({
      title: `${quiz.title} | QuizHub`,
      description: quiz.description ?? 'View quiz details, questions, and statistics.',
      path: `/quizzes/${quiz.slug || idOrSlug}`,
    });
  } catch {
    return buildMetadata({
      title: 'Quiz Details | QuizHub',
      description: 'View quiz details, questions, and statistics.',
      path: `/quizzes/${idOrSlug}`,
    });
  }
}

export default async function QuizDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;

  let jsonLd: string | null = null;
  try {
    const quiz = projectQuizToPlayerView(await getQuizByIdOrSlug(idOrSlug));
    const publishedVersion = quiz.publishedVersion;
    jsonLd = safeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Quiz',
      name: quiz.title,
      description: quiz.description ?? undefined,
      educationalLevel: publishedVersion?.difficulty,
      timeRequired: toIsoDuration(publishedVersion?.durationMs),
      numberOfQuestions: publishedVersion?.questions.length ?? 0,
      isAccessibleForFree: true,
      url: new URL(`/quizzes/${quiz.slug || idOrSlug}`, siteConfig.url).toString(),
      image: absoluteImageUrl(quiz.imageUrl),
    });
  } catch {
    jsonLd = null;
  }

  return (
    <>
      {jsonLd ? (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      ) : null}
      {children}
    </>
  );
}
