
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'

import type { ReactNode } from 'react'

const mockApolloSubtreeProviderChildren = vi.fn()

const MockApolloSubtreeProvider = ({ children }: { children: ReactNode }) => {
  mockApolloSubtreeProviderChildren(children)
  return React.createElement('div', { 'data-testid': 'apollo-subtree-stub' }, children)
}

const mockPublicProfilePage = vi.fn()

vi.mock('@/lib/graphql', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql')>('@/lib/graphql')
  return {
    ...actual,
    ApolloSubtreeProvider: MockApolloSubtreeProvider,
  }
})

vi.mock('@/features/users/components/profile/PublicProfilePage', () => ({
  default: (props: { routeName: string }) => {
    mockPublicProfilePage(props)
    return React.createElement(
      'div',
      { 'data-testid': 'public-profile-page-stub' },
      `stub:${props.routeName}`,
    )
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ name: 'alice' }),
}))

async function loadPage() {
  const mod = await import('../page')
  return mod.default
}

beforeEach(() => {
  mockApolloSubtreeProviderChildren.mockReset()
  mockPublicProfilePage.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('/profile/[name] route page', () => {
  it('wraps the profile composition in <ApolloSubtreeProvider>', async () => {
    const Page = await loadPage()
    render(<Page />)

    expect(screen.getByTestId('apollo-subtree-stub')).toBeInTheDocument()
    expect(screen.getByTestId('public-profile-page-stub')).toBeInTheDocument()
    expect(mockApolloSubtreeProviderChildren).toHaveBeenCalledTimes(1)
    expect(mockPublicProfilePage).toHaveBeenCalledTimes(1)
  })

  it('forwards the [name] route param to PublicProfilePage', async () => {
    const Page = await loadPage()
    render(<Page />)

    const stub = screen.getByTestId('public-profile-page-stub')
    expect(stub.textContent).toBe('stub:alice')
  })
})
