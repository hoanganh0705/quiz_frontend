/**
 * axe-core audit for <TagPill /> and <CategoryCard />.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.F2.
 *
 * Runs axe-core against fragments containing:
 *   - TagPill (default + clickable variants)
 *   - CategoryCard (resolved, with and without image)
 *
 * Same structural-only rule set as F1; color-contrast is verified
 * manually with the OS dark-mode toggle.
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
  )
}))

import { render } from '@testing-library/react'
import axe from 'axe-core'

import { TagPill } from '../TagPill/TagPill'
import { CategoryCard } from '../CategoryCard/CategoryCard'
import {
  mockCategoryResponseDto,
  mockTagResponseDto
} from './render-helpers'

const STRUCTURAL_RULES = [
  'area-alt',
  'aria-allowed-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'button-name',
  'bypass',
  'document-title',
  'duplicate-id',
  'empty-heading',
  'heading-order',
  'html-has-lang',
  'html-lang-valid',
  'image-alt',
  'input-image-alt',
  'label',
  'link-name',
  'list',
  'listitem',
  'meta-refresh',
  'region'
]

async function audit() {
  return axe.run(document.body, {
    runOnly: { type: 'rule', values: STRUCTURAL_RULES }
  })
}

function blockersOnly(results: Awaited<ReturnType<typeof audit>>) {
  return results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  )
}

describe('TagPill — axe a11y audit', () => {
  it('default variant: no critical or serious violations', async () => {
    const { container, unmount } = render(
      <TagPill tag={mockTagResponseDto({ name: 'algebra' })} />
    )
    document.body.appendChild(container)
    const results = await audit()
    unmount()
    document.body.innerHTML = ''
    const blockers = blockersOnly(results)
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })

  it('clickable variant: no critical or serious violations', async () => {
    const { container, unmount } = render(
      <TagPill
        tag={mockTagResponseDto({ name: 'history', slug: 'history' })}
        variant='clickable'
      />
    )
    document.body.appendChild(container)
    const results = await audit()
    unmount()
    document.body.innerHTML = ''
    const blockers = blockersOnly(results)
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })
})

describe('CategoryCard — axe a11y audit', () => {
  it('with image: no critical or serious violations', async () => {
    const { container, unmount } = render(
      <CategoryCard
        category={mockCategoryResponseDto({
          name: 'Mathematics',
          imageUrl: 'https://example.test/cat.jpg'
        })}
      />
    )
    document.body.appendChild(container)
    const results = await audit()
    unmount()
    document.body.innerHTML = ''
    const blockers = blockersOnly(results)
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })

  it('without image (initials fallback): no critical or serious violations', async () => {
    const { container, unmount } = render(
      <CategoryCard
        category={mockCategoryResponseDto({
          name: 'No image category',
          imageUrl: null
        })}
      />
    )
    document.body.appendChild(container)
    const results = await audit()
    unmount()
    document.body.innerHTML = ''
    const blockers = blockersOnly(results)
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })
})