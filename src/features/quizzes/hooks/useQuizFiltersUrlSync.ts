'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  setFromUrlSearchParams,
  useQuizFiltersStore,
} from '@/features/quizzes/store/use-quiz-filters-store'
import { serializeQuizFilterUrl } from '@/features/quizzes/types/quiz-filter-params'

const URL_SYNC_DEBOUNCE_MS = 300

export function useQuizFiltersUrlSync(): void {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The last query string this hook wrote. When `searchParams` updates
  // and matches this, the change came from us — skip re-seeding the
  // store (otherwise the round-trip can clobber an in-flight edit).
  const lastWrittenRef = useRef<string | null>(null)

  // Re-seed the store from the URL whenever the URL changes from
  // somewhere other than this hook (back/forward navigation, a shared
  // link, a programmatic `router.push`, …).
  const incomingSearch = searchParams.toString()
  useEffect(() => {
    if (incomingSearch === lastWrittenRef.current) return
    setFromUrlSearchParams(new URLSearchParams(incomingSearch))
  }, [incomingSearch])

  useEffect(() => {
    const unsubscribe = useQuizFiltersStore.subscribe((state) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        const params = serializeQuizFilterUrl(state)
        const queryString = params.toString()
        const target = queryString.length > 0 ? `${pathname}?${queryString}` : pathname
        lastWrittenRef.current = queryString
        router.replace(target)
        timerRef.current = null
      }, URL_SYNC_DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [router, pathname])
}