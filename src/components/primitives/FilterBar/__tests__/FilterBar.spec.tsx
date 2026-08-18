

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { FilterBar } from '@/components/primitives/FilterBar'
import type {
CategoryResponseDto,
TagResponseDto
} from '@/lib/api/generated/schemas'
import type { QuizFilterUrlState } from '@/features/quizzes/types/quiz-filter-params'

function makeCategory(
overrides: Partial<CategoryResponseDto> = {}
): CategoryResponseDto {
return {
categoryId: '0192f4d8-0000-7000-8000-000000000001',
name: 'Science',
slug: 'science',
description: null,
imageUrl: null,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
...overrides
  }
}

function makeTag(
overrides: Partial<TagResponseDto> = {}
): TagResponseDto {
return {
tagId: '0192f4d8-0000-7000-8000-000000000001',
name: 'Tag One',
slug: 'tag-one',
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
...overrides
  }
}

const CATEGORIES: CategoryResponseDto[] = [
makeCategory({
categoryId: 'cat-1',
name: 'Science',
slug: 'science'
  }),
makeCategory({
categoryId: 'cat-2',
name: 'History',
slug: 'history'
  })
]

const TAGS: TagResponseDto[] = [
makeTag({ tagId: 'tag-1', slug: 'a', name: 'Alpha' }),
makeTag({ tagId: 'tag-2', slug: 'b', name: 'Bravo' })
]

afterEach(() => cleanup())

describe('FilterBar — tag click', () => {
it('calls onChange with the updated tagSlugs array', () => {
const onChange = vi.fn()
render(
<FilterBar
state={{}}
categories={CATEGORIES}
tags={TAGS}
onChange={onChange}
      />
    )

const pills = screen.getAllByTestId('filter-bar-tag-pill')
fireEvent.click(pills[0])

expect(onChange).toHaveBeenCalledWith({
tagSlugs: ['a']
    })
  })

it('removes a tag when the user clicks a selected pill', () => {
const onChange = vi.fn()
render(
<FilterBar
state={{ tagSlugs: ['a'] }}
categories={CATEGORIES}
tags={TAGS}
onChange={onChange}
      />
    )

const pills = screen.getAllByTestId('filter-bar-tag-pill')
fireEvent.click(pills[0])

expect(onChange).toHaveBeenCalledWith({
tagSlugs: undefined
    })
  })
})

describe('FilterBar — difficulty change', () => {
it('calls onChange with "easy" when the user clicks the Easy radio', () => {
const onChange = vi.fn()
render(
<FilterBar
state={{}}
categories={CATEGORIES}
tags={TAGS}
onChange={onChange}
      />
    )

const easy = screen.getByLabelText('Easy')
fireEvent.click(easy)

expect(onChange).toHaveBeenCalledWith({
difficulty: 'easy'
    })
  })

it('clears the difficulty when the user clicks "All levels"', () => {
const onChange = vi.fn()
render(
<FilterBar
state={{ difficulty: 'easy' }}
categories={CATEGORIES}
tags={TAGS}
onChange={onChange}
      />
    )

const all = screen.getByLabelText('All levels')
fireEvent.click(all)

expect(onChange).toHaveBeenCalledWith({
difficulty: undefined
    })
  })
})

describe('FilterBar — prop contract', () => {
it('accepts the documented props', () => {
const state: QuizFilterUrlState = {
categoryId: 'cat-1',
tagSlugs: ['a'],
sort: 'popular',
difficulty: 'easy'
    }
render(
<FilterBar
state={state}
categories={CATEGORIES}
tags={TAGS}
onChange={() => {}}
      />
    )

expect(screen.getByTestId('filter-bar-desktop')).toBeInTheDocument()
  })

it('renders four filter affordances', () => {
const state: QuizFilterUrlState = {}
render(
<FilterBar
state={state}
categories={CATEGORIES}
tags={TAGS}
onChange={() => {}}
      />
    )
expect(screen.getByTestId('filter-bar-category-trigger')).toBeInTheDocument()
expect(screen.getByTestId('filter-bar-sort-trigger')).toBeInTheDocument()
expect(screen.getByTestId('filter-bar-difficulty')).toBeInTheDocument()
expect(screen.getByTestId('filter-bar-tags')).toBeInTheDocument()
  })
})
