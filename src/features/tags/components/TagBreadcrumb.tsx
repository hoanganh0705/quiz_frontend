/**
 * `<TagBreadcrumb />` — the `Home / Tags / <tag.name>` breadcrumb
 * for the tag detail page.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.F2.
 *
 * Renders a hierarchical `Home / Tags / <tag.name>` breadcrumb.
 * The `<tag.name>` link uses the **canonical slug from the
 * `TagResponseDto`**, NOT the original `:slug` route param. This
 * is the defensive contract: if the user navigates to `/tags/<id>`
 * (a UUIDv7 id, not a slug — e.g. a share-link that bypasses the
 * canonical slug route), the breadcrumb still links back to the
 * canonical `/tags/<tag.slug>` URL.
 *
 * The component is a pure prop-driven renderer. No `'use client'`
 * directive; the parent page (`TagDetailPage`) is the client
 * component because it consumes the SWR hooks.
 */

import Link from 'next/link'

import type { TagResponseDto } from '@/lib/api/generated/schemas'

export interface TagBreadcrumbProps {
  /**
   * The tag the breadcrumb terminates at. The breadcrumb's final
   * segment renders `<tag.name>` and links to `/tags/<tag.slug>`.
   */
  tag: TagResponseDto
  /** Optional className for the outer `<nav>`. */
  className?: string
}

export function TagBreadcrumb({
  tag,
  className,
}: TagBreadcrumbProps): React.ReactElement {
  return (
    <nav
      aria-label='Breadcrumb'
      className={
        className ??
        'mb-3 text-sm text-muted-foreground'
      }
      data-testid='tag-breadcrumb'
    >
      <ol className='flex flex-wrap items-center gap-1'>
        <li>
          <Link
            href='/'
            className='hover:text-foreground hover:underline'
          >
            Home
          </Link>
        </li>
        <li aria-hidden='true'>/</li>
        <li>
          <Link
            href='/tags'
            className='hover:text-foreground hover:underline'
          >
            Tags
          </Link>
        </li>
        <li aria-hidden='true'>/</li>
        <li>
          <Link
            href={`/tags/${tag.slug}`}
            className='hover:text-foreground hover:underline'
            data-testid='tag-breadcrumb-canonical'
            data-tag-slug={tag.slug}
          >
            {tag.name}
          </Link>
        </li>
      </ol>
    </nav>
  )
}
