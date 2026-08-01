/**
 * `<TagHeader />` — the tag detail page's header.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.C5.
 *
 * Renders the tag's display name (as the title), the slug (as a
 * sub-label), and the locality-formatted `createdAt`. The
 * `TagResponseDto` does NOT carry a `description` or `quizCount`
 * field at the wire level per TKT-3.4.A1 §3, so the header does
 * not render a body description or a quiz-count row — it omits
 * those sections cleanly.
 *
 * ## Wire-shape drift (TKT-3.4.A1 §3)
 *
 * The planning doc referenced a `TagWithStatsDto` that would carry
 * a quiz count, but the actual wire carries only `TagResponseDto`
 * (`{ tagId, name, slug, createdAt, updatedAt }`). The ticket
 * tracks this drift in `EPIC_3_4_A1.md` §1 row 8. The component
 * adapts: it renders whatever the DTO provides and omits the rest
 * with no empty placeholders. A future Epic 4 phase may extend the
 * DTO with `description`/`quizCount` — the header is structured to
 * accommodate that without rewriting the API surface.
 *
 * ## Server-renderable
 *
 * The component is a pure prop-driven renderer. No `'use client'`
 * directive; the parent page (`TagDetailPage`) is the client
 * component because it consumes the SWR hooks.
 *
 * ## Breadcrumb
 *
 * The breadcrumb (`Home / Tags / <tag.name>`) is rendered as a
 * separate sibling component upstream in `TagDetailPage`, not
 * inside the header. The `<TagBreadcrumb />` component is the single
 * source of truth for the breadcrumb markup (TKT-3.4.F2). The
 * breadcrumb links to the canonical `/tags/<tag.slug>` URL using
 * the canonical slug from the `TagResponseDto`, not the original
 * `:slug` route param.
 */

import { formatTagDate } from '@/features/tags/utils/format-tag-date'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

export interface TagHeaderProps {
  /** The tag to render. */
  tag: TagResponseDto
  /** Locale for `formatTagDate`. Defaults to `en-US`. */
  locale?: string
}

export function TagHeader({
  tag,
  locale = 'en-US',
}: TagHeaderProps): React.ReactElement {
  return (
    <header className='mb-8' data-testid='tag-header'>
      <div className='flex items-baseline gap-3'>
        <h1
          className='text-3xl font-bold text-foreground'
          data-testid='tag-header-title'
        >
          {tag.name}
        </h1>
        <span
          className='text-sm text-muted-foreground font-mono tabular-nums'
          data-testid='tag-header-slug'
        >
          {tag.slug}
        </span>
      </div>

      <p
        className='mt-2 text-xs text-muted-foreground'
        data-testid='tag-header-created-at'
      >
        Created {formatTagDate(tag.createdAt, locale)}
      </p>
    </header>
  )
}
