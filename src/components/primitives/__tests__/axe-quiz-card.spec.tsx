

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

import { QuizCard } from '../QuizCard/QuizCard'
import { mockQuizListItemDto } from './render-helpers'

async function auditQuizCard() {
const container = document.body

const results = await axe.run(container, {
runOnly: {
type: 'rule',
values: [
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
    }
  })
return results
}

describe('QuizCard — axe a11y audit', () => {
it('resolved card with image: no critical or serious violations', async () => {
const { container, unmount } = render(
<QuizCard
quiz={mockQuizListItemDto({
title: 'A friendly quiz',
imageUrl: 'https://example.test/img.jpg'
        })}
      />
    )
document.body.appendChild(container)
const results = await auditQuizCard()
unmount()
document.body.innerHTML = ''

const blockers = results.violations.filter(
(v) => v.impact === 'critical' || v.impact === 'serious'
    )
expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })

it('resolved card without image (initials fallback): no critical or serious violations', async () => {
const { container, unmount } = render(
<QuizCard
quiz={mockQuizListItemDto({
title: 'No image quiz',
imageUrl: null
        })}
      />
    )
document.body.appendChild(container)
const results = await auditQuizCard()
unmount()
document.body.innerHTML = ''

const blockers = results.violations.filter(
(v) => v.impact === 'critical' || v.impact === 'serious'
    )
expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })
})