

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { useTagBySlug } from '@/features/tags/hooks/useTagBySlug'

const getTagBySlugMock = vi.fn()

vi.mock('@/features/tags/services/tags.service', () => ({
listTags: vi.fn(),
getTagBySlug: (...args: unknown[]) => getTagBySlugMock(...args),
getTag: vi.fn(),
getTagsPopular: vi.fn(),
getTagsTrending: vi.fn(),
getTagQuizzes: vi.fn(),
getRelatedTags: vi.fn(),
getTagAnalytics: vi.fn(),
createTag: vi.fn(),
updateTag: vi.fn(),
deleteTag: vi.fn(),
}))

function makeTag(overrides: Partial<TagResponseDto> = {}): TagResponseDto {
return {
tagId: '0192f4d8-0000-7000-8000-000000000001',
name: 'javascript',
slug: 'javascript',
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
...overrides,
  }
}

function makeApiError(status: number, code = 'INTERNAL'): ApiError {
return new ApiError({
config: undefined,
request: undefined,
response: {
status,
data: { code, detail: 'fixture' },
    },
isAxiosError: true,
name: 'AxiosError',
message: `Mock ${status}`,
code,
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

function Probe() {
const { tag, isLoading, error, notFound } = useTagBySlug('javascript')
const snapshot = {
tagName: tag?.name ?? null,
tagIsNull: tag === null,
notFound,
errorStatus: error ? error.status : null,
isLoading,
  }
return <div data-testid='probe' data-value={JSON.stringify(snapshot)} />
}

function readProbe(): {
tagName: string | null
tagIsNull: boolean
notFound: boolean
errorStatus: number | null
isLoading: boolean
} {
const el = screen.getByTestId('probe')
return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
cleanup()
getTagBySlugMock.mockReset()
})

describe('useTagBySlug — happy path', () => {
it('returns the wrapper-resolved tag with isLoading=false, error=null, notFound=false', async () => {
const tag = makeTag({ name: 'javascript', slug: 'javascript' })
getTagBySlugMock.mockResolvedValue({ data: tag })

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.tagName).toBe('javascript')
expect(snap.errorStatus).toBeNull()
expect(snap.notFound).toBe(false)
expect(snap.isLoading).toBe(false)
    })

expect(getTagBySlugMock).toHaveBeenCalledWith('javascript')
  })
})

describe('useTagBySlug — 404 path', () => {
it('returns tag=null, notFound=true, error.status=404 when the wrapper throws 404', async () => {
getTagBySlugMock.mockRejectedValue(makeApiError(404, 'TAG_NOT_FOUND'))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.tagIsNull).toBe(true)
expect(snap.notFound).toBe(true)
expect(snap.errorStatus).toBe(404)
expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useTagBySlug — 5xx path', () => {
it('returns tag=null, notFound=false, error.status=500 when the wrapper throws 500', async () => {
getTagBySlugMock.mockRejectedValue(makeApiError(500))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.tagIsNull).toBe(true)
expect(snap.notFound).toBe(false)
expect(snap.errorStatus).toBe(500)
expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useTagBySlug — SWR-key stability', () => {
it('two calls with the same slug produce the same SWR key (single fetcher call)', async () => {
getTagBySlugMock.mockResolvedValue({
data: makeTag({ name: 'javascript', slug: 'javascript' }),
    })

function DoubleProbe() {
const a = useTagBySlug('javascript')
const b = useTagBySlug('javascript')
return (
<div
data-testid='probe'
data-a={a.tag?.name ?? 'null'}
data-b={b.tag?.name ?? 'null'}
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
expect(el.getAttribute('data-a')).toBe('javascript')
expect(el.getAttribute('data-b')).toBe('javascript')
    })

expect(getTagBySlugMock).toHaveBeenCalledTimes(1)
  })
})

describe('useTagBySlug — deleted-tag defensive path', () => {
it('returns notFound=true when the wrapper throws ApiError(404, code="TAG_DELETED")', async () => {
getTagBySlugMock.mockRejectedValue(makeApiError(404, 'TAG_DELETED'))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.tagIsNull).toBe(true)
expect(snap.notFound).toBe(true)
expect(snap.errorStatus).toBe(404)
expect(snap.isLoading).toBe(false)
    })
  })
})
