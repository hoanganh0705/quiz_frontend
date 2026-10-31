
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'

import type { ReactNode } from 'react'

const mockApolloSubtreeProviderChildren = vi.fn()

const MockApolloSubtreeProvider = ({ children }: { children: ReactNode }) => {
  mockApolloSubtreeProviderChildren(children)
  return React.createElement('div', { 'data-testid': 'apollo-subtree-stub' }, children)
}

const mockQuizzesDirectoryPage = vi.fn()

vi.mock('@/lib/graphql', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql')>('@/lib/graphql')
  return {
    ...actual,
    ApolloSubtreeProvider: MockApolloSubtreeProvider,
  }
})

vi.mock('@/features/quizzes', async () => {
  const actual = await vi.importActual<typeof import('@/features/quizzes')>('@/features/quizzes')
  const Stub = () => {
    mockQuizzesDirectoryPage()
    return React.createElement(
      'div',
      { 'data-testid': 'quizzes-directory-page-stub' },
      'directory-stub',
    )
  }
  Stub.displayName = 'QuizzesDirectoryPageStub'
  return {
    ...actual,
    QuizzesDirectoryPage: Stub,
  }
})

async function loadPage() {
  const mod = await import('../page')
  return mod.default
}

beforeEach(() => {
  mockApolloSubtreeProviderChildren.mockReset()
  mockQuizzesDirectoryPage.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('/quizzes route page', () => {
  it('wraps the directory composition in <ApolloSubtreeProvider>', async () => {
    const Page = await loadPage()
    render(<Page />)

    expect(screen.getByTestId('apollo-subtree-stub')).toBeInTheDocument()
    expect(screen.getByTestId('quizzes-directory-page-stub')).toBeInTheDocument()
    expect(mockApolloSubtreeProviderChildren).toHaveBeenCalledTimes(1)
    expect(mockQuizzesDirectoryPage).toHaveBeenCalledTimes(1)
  })
})
