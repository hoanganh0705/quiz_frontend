

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
  )
}))

import { render, screen } from '@testing-library/react'

import { TagPill } from '../TagPill'
import { mockTagResponseDto } from '../../__tests__/render-helpers'

describe('TagPill', () => {
it('default variant renders without a link wrapper', () => {
const tag = mockTagResponseDto({ name: 'algebra', slug: 'algebra' })
render(<TagPill tag={tag} variant='default' />)
const pill = screen.getByTestId('tag-pill')
expect(pill.tagName.toLowerCase()).toBe('span')
expect(pill.getAttribute('data-variant')).toBe('default')
expect(screen.getByText('algebra')).toBeInTheDocument()

expect(pill.querySelector('a')).toBeNull()
  })

it('clickable variant with slug renders a link to /tags/<slug>', () => {
const tag = mockTagResponseDto({ name: 'algebra', slug: 'algebra' })
render(<TagPill tag={tag} variant='clickable' />)
const pill = screen.getByTestId('tag-pill')
expect(pill.tagName.toLowerCase()).toBe('a')
expect(pill.getAttribute('href')).toBe('/tags/algebra')
expect(pill.getAttribute('data-variant')).toBe('clickable')
expect(pill.getAttribute('data-tag-slug')).toBe('algebra')
  })

it('clickable variant without slug falls back to /tags/<tagId>', () => {
const tag = mockTagResponseDto({ name: 'mystery', slug: '' })
render(<TagPill tag={tag} variant='clickable' />)
const pill = screen.getByTestId('tag-pill')
expect(pill.tagName.toLowerCase()).toBe('a')
expect(pill.getAttribute('href')).toBe(`/tags/${tag.tagId}`)
expect(pill.getAttribute('data-tag-slug')).toBe('')
  })

it('renders the deterministic swatch and the tag name', () => {
const tag = mockTagResponseDto({
tagId: '0192f4d8-eeee-7000-8000-000000000000',
name: 'history',
slug: 'history'
    })
const { container } = render(<TagPill tag={tag} />)
const swatch = container.querySelector('[aria-hidden="true"]')
expect(swatch).toBeInTheDocument()
expect(swatch?.getAttribute('style') ?? '').toMatch(/background-color/i)
expect(screen.getByText('history')).toBeInTheDocument()
  })
})