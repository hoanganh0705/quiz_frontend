'use client'
import Link from 'next/link'

import { cn } from '@/shared/utils/merge-class-names'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

const PILL_BASE =
  'inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground'
const SWATCH_BASE = 'inline-block h-2 w-2 rounded-full'

export type TagPillVariant = 'default' | 'clickable'

export interface TagPillProps {
  tag: TagResponseDto
  variant?: TagPillVariant
  className?: string
}

// Five swatches drawn from --tag-swatch-1..5 in globals.css. The sixth hash
// bucket falls back to --tag-swatch-1 so the palette stays brand-stable.
const SWATCH_TOKEN_CLASSES = [
  'bg-tag-swatch-1',
  'bg-tag-swatch-2',
  'bg-tag-swatch-3',
  'bg-tag-swatch-4',
  'bg-tag-swatch-5'
] as const

function swatchClassFromTag(tag: TagResponseDto): string {
  let hash = 0
  for (let i = 0; i < tag.tagId.length; i += 1) {
    hash = (hash * 31 + tag.tagId.charCodeAt(i)) >>> 0
  }
  const idx = hash % SWATCH_TOKEN_CLASSES.length
  return SWATCH_TOKEN_CLASSES[idx]!
}

export function TagPill({
  tag,
  variant = 'default',
  className
}: TagPillProps) {
  const swatchClass = swatchClassFromTag(tag)

  const inner = (
    <>
      <span
        aria-hidden='true'
        className={cn(SWATCH_BASE, swatchClass)}
      />
      <span>{tag.name}</span>
    </>
  )

  if (variant === 'clickable') {
    const href = `/tags/${tag.slug || tag.tagId}`
    return (
      <Link
        href={href}
        className={cn(PILL_BASE, 'transition hover:bg-accent', className)}
        data-testid='tag-pill'
        data-tag-id={tag.tagId}
        data-tag-slug={tag.slug}
        data-variant='clickable'
      >
        {inner}
      </Link>
    )
  }

  return (
    <span
      className={cn(PILL_BASE, className)}
      data-testid='tag-pill'
      data-tag-id={tag.tagId}
      data-tag-slug={tag.slug}
      data-variant='default'
    >
      {inner}
    </span>
  )
}
