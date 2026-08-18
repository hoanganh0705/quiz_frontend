'use client'

import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'

export const swrConfig = {

revalidateOnFocus: false,

revalidateIfStale: false,

dedupingInterval: 2_000,

errorRetryCount: 3,

shouldRetryOnError: (err: unknown): boolean => {
if (err instanceof ApiError) {
return err.status === 429 || err.status >= 500
    }
return false
  },
} as const

export function SwrProvider({ children }: { children: ReactNode }) {
return <SWRConfig value={swrConfig}>{children}</SWRConfig>
}
