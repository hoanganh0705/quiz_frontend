

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

import { CategoryHeader } from '@/features/categories/components/CategoryHeader'

describe('CategoryHeader', () => {
it('renders the title, with quizCount, without parent breadcrumb', () => {
render(
<CategoryHeader
title='Mathematics'
description='All math quizzes.'
quizCount={1234}
      />,
    )
const header = screen.getByTestId('category-header')
expect(header).toBeInTheDocument()
expect(
screen.getByRole('heading', { name: /mathematics/i }),
    ).toBeInTheDocument()
expect(screen.getByText(/all math quizzes/i)).toBeInTheDocument()
expect(screen.getByTestId('category-header-quiz-count')).toHaveTextContent(
'1,234 quizzes',
    )

expect(
screen.queryByRole('navigation', { name: /breadcrumb/i }),
    ).not.toBeInTheDocument()
  })

it('renders the parent breadcrumb when parent is provided', () => {
render(
<CategoryHeader
title='Algebra'
description={null}
parent={{ name: 'Mathematics', slug: 'mathematics' }}
      />,
    )
const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
expect(nav).toBeInTheDocument()

const parentLink = nav.querySelector('a[href="/categories/mathematics"]')
expect(parentLink).toHaveTextContent('Mathematics')
  })

it('omits the quiz-count row when quizCount is not provided', () => {
render(<CategoryHeader title='History' description={null} />)
expect(
screen.queryByTestId('category-header-quiz-count'),
    ).not.toBeInTheDocument()
  })

it('omits the description paragraph when description is null', () => {
render(<CategoryHeader title='History' description={null} />)

const header = screen.getByTestId('category-header')
expect(header.querySelector('p')).toBeNull()
  })
})
