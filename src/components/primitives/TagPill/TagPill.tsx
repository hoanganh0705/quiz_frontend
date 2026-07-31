'use client'

/**
 * <TagPill /> — compact tag representation used inline in cards, lists,
 * and detail pages.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.D1.
 *
 * Two variants:
 *   - default:    non-interactive visual only.
 *   - clickable:  wrapped in <Link> to /tags/[slug] (or /tags/[id] if
 *                 the slug is empty). Focusable + keyboard-activatable.
 *
 * Drift note (TKT-3.1.A1): the SDK exposes `TagResponseDto` (not
 * `TagDto`). The id field is `tagId` (not `id`). The slug-vs-id
 * navigation rule (Story 3.1) reads `tag.slug` first and falls back to
 * `tag.tagId`. There is no `usageCount` on the SDK type, so the pill
 * renders only the tag name + a deterministic color swatch.
 */

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

function colorFromTag(tag: TagResponseDto): string {
  // Deterministic per-id swatch so server and client agree (no hydration
  // mismatch). Picks from a 12-hue palette; saturation/lightness fixed.
  const seed = tag.tagId.replace(/-/g, '').slice(-6)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return `hsl(${hue} 60% 45%)`
}

export function TagPill({
  tag,
  variant = 'default',
  className
}: TagPillProps) {
  const swatchColor = colorFromTag(tag)

  const inner = (
    <>
      <span
        aria-hidden='true'
        className={SWATCH_BASE}
        style={{ backgroundColor: swatchColor }}
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