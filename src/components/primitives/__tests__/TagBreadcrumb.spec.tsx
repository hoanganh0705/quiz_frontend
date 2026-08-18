

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

const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
expect(nav).toBeInTheDocument()

const tagsLink = nav.querySelector('a[href="/tags"]')
expect(tagsLink).toBeInTheDocument()
expect(tagsLink).toHaveTextContent('Tags')

const canonicalLink = screen.getByTestId('tag-breadcrumb-canonical')
expect(canonicalLink).toHaveAttribute('href', '/tags/javascript')
expect(canonicalLink).toHaveTextContent('JavaScript')
expect(canonicalLink).toHaveAttribute('data-tag-slug', 'javascript')

const homeLink = nav.querySelector('a[href="/"]')
expect(homeLink).toBeInTheDocument()
expect(homeLink).toHaveTextContent('Home')
  })
})
