

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSWRConfig } from 'swr'

import { SwrProvider, swrConfig } from '@/providers/SwrProvider'
import { ApiError } from '@/lib/api'

function ConfigProbe({ testId = 'swr-config-probe' }: { testId?: string }) {
const config = useSWRConfig()

const summary = {
revalidateOnFocus: config.revalidateOnFocus,
revalidateIfStale: config.revalidateIfStale,
dedupingInterval: config.dedupingInterval,
errorRetryCount: config.errorRetryCount,
shouldRetryOnError: config.shouldRetryOnError,
  }
return (
<div data-testid={testId} data-config={JSON.stringify(summary)} />
  )
}

describe('SwrProvider', () => {
it('renders its children (passthrough)', () => {
render(
<SwrProvider>
<span data-testid="probe">child</span>
</SwrProvider>
    )
expect(screen.getByTestId('probe')).toBeInTheDocument()
expect(screen.getByTestId('probe')).toHaveTextContent('child')
  })

it('passes the bound config to descendants', () => {
render(
<SwrProvider>
<ConfigProbe />
</SwrProvider>
    )
const probe = screen.getByTestId('swr-config-probe')
const raw = probe.getAttribute('data-config')
expect(raw).not.toBeNull()
const parsed = JSON.parse(raw ?? '{}') as {
revalidateOnFocus?: boolean
revalidateIfStale?: boolean
dedupingInterval?: number
errorRetryCount?: number
shouldRetryOnError?: 'serialised-as-undefined'
    }

expect(parsed.revalidateOnFocus).toBe(false)
expect(parsed.revalidateIfStale).toBe(false)
expect(parsed.dedupingInterval).toBe(2_000)
expect(parsed.errorRetryCount).toBe(3)
  })

it('shouldRetryOnError returns true for ApiError with status 429', () => {

const rateLimited = ApiError.fromAxios({
name: 'AxiosError',
message: 'Too many requests',
isAxiosError: true,
toJSON: () => ({}),
response: {
data: { extensions: { code: 'AUTH_RATE_LIMITED' } },
status: 429,
statusText: 'Too Many Requests',
headers: {},
config: {} as never,
      },
    } as never)
expect(swrConfig.shouldRetryOnError(rateLimited)).toBe(true)
  })

it('shouldRetryOnError returns true for ApiError with status 5xx', () => {
const serverError = ApiError.fromAxios({
name: 'AxiosError',
message: 'Server error',
isAxiosError: true,
toJSON: () => ({}),
response: {
data: {},
status: 500,
statusText: 'Internal Server Error',
headers: {},
config: {} as never,
      },
    } as never)
expect(swrConfig.shouldRetryOnError(serverError)).toBe(true)
  })

it('shouldRetryOnError returns false for ApiError with non-429 4xx', () => {
const notFound = ApiError.fromAxios({
name: 'AxiosError',
message: 'Not found',
isAxiosError: true,
toJSON: () => ({}),
response: {
data: {},
status: 404,
statusText: 'Not Found',
headers: {},
config: {} as never,
      },
    } as never)
expect(swrConfig.shouldRetryOnError(notFound)).toBe(false)
  })

it('shouldRetryOnError returns false for non-ApiError values (incl. NetworkError)', () => {

expect(swrConfig.shouldRetryOnError(new Error('network'))).toBe(false)
expect(swrConfig.shouldRetryOnError('plain string error')).toBe(false)
expect(swrConfig.shouldRetryOnError(null)).toBe(false)
expect(swrConfig.shouldRetryOnError(undefined)).toBe(false)
  })

it('exports the same swrConfig the provider mounts (no drift)', () => {

render(
<SwrProvider>
<ConfigProbe testId="swr-config-probe-drift" />
</SwrProvider>
    )
const probe = screen.getByTestId('swr-config-probe-drift')
const parsed = JSON.parse(probe.getAttribute('data-config') ?? '{}') as {
revalidateOnFocus?: boolean
revalidateIfStale?: boolean
dedupingInterval?: number
errorRetryCount?: number
    }
expect(parsed.revalidateOnFocus).toBe(swrConfig.revalidateOnFocus)
expect(parsed.revalidateIfStale).toBe(swrConfig.revalidateIfStale)
expect(parsed.dedupingInterval).toBe(swrConfig.dedupingInterval)
expect(parsed.errorRetryCount).toBe(swrConfig.errorRetryCount)
  })
})
