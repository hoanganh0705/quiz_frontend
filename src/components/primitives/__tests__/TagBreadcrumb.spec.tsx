/**
 * `<TagBreadcrumb />` — unit spec.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.F2 (testing checklist).
 *
 * One case per ticket:
 *   - The breadcrumb links `Tags` to `/tags` and the terminating
 *     segment to `/tags/<tag.slug>` (the canonical slug from the
 *     `TagResponseDto`, NOT the original `:slug` route param).
 *
 * The component is server-renderable; the test renders it under
 * the jsdom env (so jsxdom's normal DOM is available).
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { render, screen } from '@testing-library/react'

import { TagBreadcrumb } from '@/features/tags/components/TagBreadcrumb'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

function makeTag(
  overrides: Partial<TagResponseDto> = {},
): TagResponseDto {
  return {
    tagId: '0192f4d8-0000-7000-8000-000000000001',
    name: 'JavaScript',
    slug: 'javascript',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('TagBreadcrumb', () => {
  it('renders the canonical-slug link by reading tag.slug (not the route param)', () => {
    const tag = makeTag({ name: 'JavaScript', slug: 'javascript' })
    render(<TagBreadcrumb tag={tag} />)

    // The breadcrumb exposes itself via `<nav aria-label="Breadcrumb">`.
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()

    // The `Tags` link points to `/tags`.
    const tagsLink = nav.querySelector('a[href="/tags"]')
    expect(tagsLink).toBeInTheDocument()
    expect(tagsLink).toHaveTextContent('Tags')

    // The terminating link points to `/tags/<tag.slug>` and renders
    // `<tag.name>` as the link text — even if the original route param
    // was a different value (e.g. a UUIDv7 id), the canonical slug
    // comes from the response.
    const canonicalLink = screen.getByTestId('tag-breadcrumb-canonical')
    expect(canonicalLink).toHaveAttribute('href', '/tags/javascript')
    expect(canonicalLink).toHaveTextContent('JavaScript')
    expect(canonicalLink).toHaveAttribute('data-tag-slug', 'javascript')

    // The `Home` link points to `/`.
    const homeLink = nav.querySelector('a[href="/"]')
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveTextContent('Home')
  })
})
