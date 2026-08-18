

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { SWRConfig } from 'swr'

import {
resetFilters,
setFilter,
useQuizFiltersStore
} from '@/features/quizzes/store/use-quiz-filters-store'
import { useQuizFiltersUrlSync } from '@/features/quizzes/hooks/useQuizFiltersUrlSync'

const mockRouterReplace = vi.fn()
const mockUsePathname = vi.fn()
const mockUseSearchParams = vi.fn()

vi.mock('next/navigation', () => ({
useRouter: () => ({
replace: (...args: unknown[]) => mockRouterReplace(...args),
push: vi.fn(),
back: vi.fn(),
forward: vi.fn(),
refresh: vi.fn(),
prefetch: vi.fn()
  }),
usePathname: () => mockUsePathname(),
useSearchParams: () => mockUseSearchParams()
}))

function TestProbe({ onMount }: { onMount?: () => void }) {
useQuizFiltersUrlSync()
if (onMount) onMount()
return null
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0
      }}
    >
{children}
</SWRConfig>
  )
}

beforeEach(() => {
vi.useFakeTimers()
mockRouterReplace.mockReset()
mockUsePathname.mockReturnValue('/quizzes')
mockUseSearchParams.mockReturnValue(new URLSearchParams(''))
resetFilters()
})

afterEach(() => {
cleanup()
vi.useRealTimers()
})

describe('useQuizFiltersUrlSync — mount seeds store from URL', () => {
it('parses the URL search params into the store on mount', () => {
mockUseSearchParams.mockReturnValue(
new URLSearchParams('sort=popular&difficulty=easy')
    )

render(
<TestSwrProvider>
<TestProbe />
</TestSwrProvider>
    )

const state = useQuizFiltersStore.getState()
expect(state.sort).toBe('popular')
expect(state.difficulty).toBe('easy')
  })
})

describe('useQuizFiltersUrlSync — debounced URL write', () => {
it('writes the URL 300 ms after a store change (not before)', () => {
render(
<TestSwrProvider>
<TestProbe />
</TestSwrProvider>
    )

expect(mockRouterReplace).not.toHaveBeenCalled()

act(() => {
setFilter('sort', 'popular')
    })

act(() => {
vi.advanceTimersByTime(100)
    })
expect(mockRouterReplace).not.toHaveBeenCalled()

act(() => {
vi.advanceTimersByTime(200)
    })
expect(mockRouterReplace).toHaveBeenCalledTimes(1)
expect(mockRouterReplace).toHaveBeenCalledWith('/quizzes?sort=popular')
  })

it('uses router.replace (NOT router.push)', () => {
render(
<TestSwrProvider>
<TestProbe />
</TestSwrProvider>
    )

act(() => {
setFilter('sort', 'newest')
    })

act(() => {
vi.advanceTimersByTime(300)
    })

expect(mockRouterReplace).toHaveBeenCalledTimes(1)
  })
})

describe('useQuizFiltersUrlSync — unmount cancels in-flight debounce', () => {
it('does not write to the URL after unmount', () => {
const { unmount } = render(
<TestSwrProvider>
<TestProbe />
</TestSwrProvider>
    )

act(() => {
setFilter('sort', 'trending')
    })

act(() => {
vi.advanceTimersByTime(100)
    })

unmount()

act(() => {
vi.advanceTimersByTime(500)
    })

expect(mockRouterReplace).not.toHaveBeenCalled()
  })
})
