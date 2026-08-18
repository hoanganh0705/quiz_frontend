

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError, isApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { useQuizRelated } from '@/features/quizzes/hooks/useQuizRelated'

const getQuizzesRelatedMock = vi.fn()

vi.mock('@/features/quizzes/services/quizzes.service', async () => {
const actual =
await vi.importActual<
typeof import('@/features/quizzes/services/quizzes.service')
    >('@/features/quizzes/services/quizzes.service')
return {
...actual,
getQuizzesRelated: (...args: unknown[]) =>
getQuizzesRelatedMock(...args),
  }
})

function makeQuizItem(index: number): QuizListItemDto {
return {
quizId: `0192f4d8-0000-7000-8000-${String(index).padStart(12, '0')}`,
creatorId: null,
creator: {
userId: '0192f4d8-0000-7000-8000-000000000002',
username: 'testuser',
displayName: 'Test User',
avatarUrl: null,
    },
title: `Related Quiz ${index}`,
description: null,
slug: `related-quiz-${index}`,
requirements: null,
imageUrl: null,
categoryId: null,
categoryName: null,
categorySlug: null,
isFeatured: false,
isHidden: false,
isVerified: false,
publishedVersionId: null,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
questionCount: 10,
averageRating: 4.0,
reviewCount: 5,
attemptCount: 50,
tags: [],
  }
}

function makeApiError(status: number, code = `CODE_${status}`): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Mock ${status}`,
code,
config: undefined,
request: undefined,
response: {
status,
data: { code, detail: 'fixture' },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0])
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0,
      }}
    >
{children}
</SWRConfig>
  )
}

interface ProbeSnapshot {
itemsLength: number
isLoading: boolean
errorStatus: number | null
notFound: boolean
}

function makeProbe(idOrSlug: string | null) {
return function Probe() {
const { items, isLoading, error, notFound } = useQuizRelated(idOrSlug)
const snapshot: ProbeSnapshot = {
itemsLength: items.length,
isLoading,
errorStatus: error && isApiError(error) ? error.status : null,
notFound,
    }
return (
<div data-testid='probe' data-value={JSON.stringify(snapshot)} />
    )
  }
}

function readProbe(): ProbeSnapshot {
const el = screen.getByTestId('probe')
return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
cleanup()
getQuizzesRelatedMock.mockReset()
})

function RerenderProbe({
idOrSlug,
}: {
idOrSlug: string | null
}) {
const { items, isLoading } = useQuizRelated(idOrSlug)
return (
<div data-testid='probe'>
<span data-testid='count'>{items.length}</span>
<span data-testid='loading'>{isLoading ? '1' : '0'}</span>
</div>
  )
}

describe('useQuizRelated — disabled state', () => {
it("returns `{ items: [], isLoading: false, error: null, notFound: false }` and does NOT call the wrapper when `idOrSlug` is null", async () => {
const Probe = makeProbe(null)

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

const snap = readProbe()
expect(snap).toEqual({
itemsLength: 0,
isLoading: false,
errorStatus: null,
notFound: false,
    })

expect(getQuizzesRelatedMock).not.toHaveBeenCalled()
  })
})

describe('useQuizRelated — happy path', () => {
it('returns a 4-item list with isLoading=false, error=null, notFound=false', async () => {
const list: QuizListItemDto[] = [
makeQuizItem(1),
makeQuizItem(2),
makeQuizItem(3),
makeQuizItem(4),
    ]
getQuizzesRelatedMock.mockResolvedValue({ data: list })

const Probe = makeProbe('quiz-abc')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.itemsLength).toBe(4)
expect(snap.isLoading).toBe(false)
expect(snap.errorStatus).toBeNull()
expect(snap.notFound).toBe(false)
    })

expect(getQuizzesRelatedMock).toHaveBeenCalledWith('quiz-abc', {
limit: 4,
    })
  })

it('returns an empty list when the wrapper resolves `{ data: [] }`', async () => {
getQuizzesRelatedMock.mockResolvedValue({ data: [] })

const Probe = makeProbe('quiz-empty')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.itemsLength).toBe(0)
expect(snap.errorStatus).toBeNull()
expect(snap.notFound).toBe(false)
    })
  })

it('treats a missing `data` key (`{ }`) the same as an empty list', async () => {
getQuizzesRelatedMock.mockResolvedValue({})

const Probe = makeProbe('quiz-missing-data')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.itemsLength).toBe(0)
expect(snap.errorStatus).toBeNull()
expect(snap.notFound).toBe(false)
    })
  })
})

describe('useQuizRelated — 404', () => {
it('maps an ApiError(404) to `{ items: [], isLoading: false, error: null, notFound: true }`', async () => {
getQuizzesRelatedMock.mockRejectedValue(
makeApiError(404, 'QUIZ_NOT_FOUND'),
    )

const Probe = makeProbe('quiz-missing')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.itemsLength).toBe(0)
expect(snap.isLoading).toBe(false)

expect(snap.errorStatus).toBeNull()
expect(snap.notFound).toBe(true)
    })
  })
})

describe('useQuizRelated — non-404 failures', () => {
it('surfaces the typed ApiError for a 5xx and leaves notFound=false', async () => {
getQuizzesRelatedMock.mockRejectedValue(makeApiError(500, 'INTERNAL'))

const Probe = makeProbe('quiz-500')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.itemsLength).toBe(0)
expect(snap.errorStatus).toBe(500)
expect(snap.notFound).toBe(false)
    })
  })

it('surfaces the typed ApiError for a 422 (validation) and leaves notFound=false', async () => {
getQuizzesRelatedMock.mockRejectedValue(makeApiError(422, 'BAD_LIMIT'))

const Probe = makeProbe('quiz-422')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.errorStatus).toBe(422)
expect(snap.notFound).toBe(false)
    })
  })

it('surfaces the typed ApiError for a 429 (after SWR retries) and leaves notFound=false', async () => {
getQuizzesRelatedMock.mockRejectedValue(makeApiError(429, 'RATE_LIMITED'))

const Probe = makeProbe('quiz-429')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.errorStatus).toBe(429)
expect(snap.notFound).toBe(false)
    })
  })
})

describe('useQuizRelated — SWR-key stability', () => {
it('two concurrent hooks with the same `idOrSlug` deduplicate to one fetcher call', async () => {
getQuizzesRelatedMock.mockResolvedValue({
data: [makeQuizItem(1), makeQuizItem(2)],
    })

function DoubleProbe() {
const a = useQuizRelated('same-slug')
const b = useQuizRelated('same-slug')
return (
<div
data-testid='probe'
data-a={a.items.length}
data-b={b.items.length}
        />
      )
    }

render(
<TestSwrProvider>
<DoubleProbe />
</TestSwrProvider>,
    )

await waitFor(() => {
const el = screen.getByTestId('probe')
expect(el.getAttribute('data-a')).toBe('2')
expect(el.getAttribute('data-b')).toBe('2')
    })

expect(getQuizzesRelatedMock).toHaveBeenCalledTimes(1)
expect(getQuizzesRelatedMock).toHaveBeenCalledWith('same-slug', {
limit: 4,
    })
  })

it('changing `idOrSlug` triggers a new fetch and the previous items are not inherited', async () => {

getQuizzesRelatedMock
      .mockResolvedValueOnce({
data: [makeQuizItem(1), makeQuizItem(2)],
      })
      .mockResolvedValueOnce({
data: [makeQuizItem(10), makeQuizItem(11), makeQuizItem(12)],
      })

const { rerender } = render(
<TestSwrProvider>
<RerenderProbe idOrSlug="quiz-A" />
</TestSwrProvider>,
    )

await waitFor(() => {
expect(screen.getByTestId('count').textContent).toBe('2')
    })

rerender(
<TestSwrProvider>
<RerenderProbe idOrSlug="quiz-B" />
</TestSwrProvider>,
    )

await waitFor(() => {
expect(screen.getByTestId('count').textContent).toBe('3')
    })

expect(getQuizzesRelatedMock).toHaveBeenCalledTimes(2)
expect(getQuizzesRelatedMock).toHaveBeenNthCalledWith(
1,
'quiz-A',
{ limit: 4 },
    )
expect(getQuizzesRelatedMock).toHaveBeenNthCalledWith(
2,
'quiz-B',
{ limit: 4 },
    )
  })

it('toggling between `null` and a real `idOrSlug` does not leak the previous items', async () => {
getQuizzesRelatedMock.mockResolvedValue({
data: [makeQuizItem(1), makeQuizItem(2)],
    })

const { rerender } = render(
<TestSwrProvider>
<RerenderProbe idOrSlug={null} />
</TestSwrProvider>,
    )

expect(screen.getByTestId('count').textContent).toBe('0')
expect(getQuizzesRelatedMock).not.toHaveBeenCalled()

rerender(
<TestSwrProvider>
<RerenderProbe idOrSlug="quiz-enabled" />
</TestSwrProvider>,
    )

await waitFor(() => {
expect(screen.getByTestId('count').textContent).toBe('2')
    })

expect(getQuizzesRelatedMock).toHaveBeenCalledTimes(1)
  })
})

describe('useQuizRelated — silent failure', () => {
it('does NOT call console.error / console.warn for any outcome', async () => {
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

getQuizzesRelatedMock.mockRejectedValue(makeApiError(500))

const Probe = makeProbe('quiz-silent')

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()

expect(snap.errorStatus).toBe(500)
    })

expect(errorSpy).not.toHaveBeenCalled()
expect(warnSpy).not.toHaveBeenCalled()

errorSpy.mockRestore()
warnSpy.mockRestore()
  })
})
