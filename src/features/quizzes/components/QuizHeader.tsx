

'use client';

import Link from 'next/link';

import { cn } from '@/shared/utils/merge-class-names';
import { TagPill } from '@/components/primitives/TagPill/TagPill';

import type { PlayerQuizDetail } from '../lib/quiz-player-view';

const HEADER_OUTER =
'flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8';
const COVER_WRAPPER =
'relative w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-72 md:w-80';
const COVER_RATIO = 'aspect-[4/3]';
const COVER_IMG = 'object-cover';
const COVER_FALLBACK =
'flex h-full w-full items-center justify-center text-3xl font-semibold uppercase text-muted-foreground';
const BODY = 'flex min-w-0 flex-1 flex-col gap-3';
const TITLE = 'text-2xl font-bold tracking-tight sm:text-3xl';
const META_ROW = 'flex flex-wrap items-center gap-2';
const CATEGORY_LINK =
'inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-xs text-foreground transition hover:bg-accent';
const TAGS_ROW = 'flex flex-wrap gap-1.5';

export interface QuizHeaderProps {
quiz: PlayerQuizDetail;
className?: string;
}

function initialsFromQuiz(quiz: PlayerQuizDetail): string {
const words = quiz.title.trim().split(/\s+/).slice(0, 2);
const chars = words.map((word) => word.charAt(0).toUpperCase());
return chars.join('') || 'QZ';
}

export function QuizHeader({ quiz, className }: QuizHeaderProps) {
return (
<header
className={cn(HEADER_OUTER, className)}
data-testid='quiz-header'
data-quiz-id={quiz.quizId}
    >
<div className={cn(COVER_WRAPPER, COVER_RATIO)}>
{quiz.imageUrl ? (

<img
src={quiz.imageUrl}
alt={`Cover image for ${quiz.title}`}
loading='lazy'
className={COVER_IMG}
          />
        ) : (
<span aria-hidden='true' className={COVER_FALLBACK}>
{initialsFromQuiz(quiz)}
</span>
        )}
</div>

<div className={BODY}>
<h1 className={TITLE} data-testid='quiz-header-title'>
{quiz.title}
</h1>

<div className={META_ROW}>
{quiz.categoryId ? (
<Link
href={`/categories/${quiz.categoryId}`}
className={CATEGORY_LINK}
data-testid='quiz-header-category'
data-category-id={quiz.categoryId}
aria-label='View category'
            >
Category
            </Link>
          ) : null}
</div>

{quiz.tags.length > 0 ? (
<div className={TAGS_ROW} data-testid='quiz-header-tags'>
{quiz.tags.map((tag) => (
<TagPill
key={tag.tagId}
tag={{

tagId: tag.tagId,
name: tag.name,
slug: tag.slug,
createdAt: '',
updatedAt: '',
                }}
variant='clickable'
              />
            ))}
</div>
        ) : null}
</div>
</header>
  );
}
