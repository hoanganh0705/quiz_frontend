'use client'

/**
 * `useQuizFiltersUrlSync` — bridge between the in-memory filter
 * store and the URL.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.C2.
 *
 * The hook is the ONLY place that reads from / writes to
 * `window.location`. The store stays pure (TKT-3.5.C1 §"SSR safety").
 *
 * ## Two-phase behavior
 *
 * 1. **Mount (seed).** On first render, the hook reads `useSearchParams()`
 *    and calls `useQuizFiltersStore.getState().setFromUrlSearchParams(params)`
 *    so the URL is the source of truth on hard reload (Story 3.5
 *    line 549, AC #3).
 * 2. **Subsequent updates (sync).** On every store state change, the
 *    hook debounces 300 ms then calls `router.replace(<pathname>?<serialised>)`
 *    to write the new state to the URL without adding a history
 *    entry. The 300 ms debounce is the Story 3.5 line 549 contract.
 *
 * The debounce is at the *state-change* level, not at the *keystroke*
 * level. The `<FilterBar />` UI calls `setFilter` immediately on every
 * keystroke; the URL write is debounced so a fast user typing in the
 * tag multi-select does not push 20 history entries.
 *
 * ## No `router.push`
 *
 * The hook uses `router.replace`, not `router.push`. We do not want
 * filter changes to add history entries (the back button should
 * take the user OUT of the directory, not un-filter one
 * dropdown at a time).
 *
 * ## Cleanup
 *
 * The hook cancels the in-flight debounce timer on unmount so a
 * store state change immediately before unmount does not fire a
 * `router.replace` after the component is gone.
 *
 * ## SSR safety
 *
 * The hook bypasses `useEffect` on the server (React's invariant:
 * "useRouter should not be used on the server"). The mount-seed
 * effect runs only on the client; the server renders the directory
 * with the URL's filter state pre-baked into the rendered HTML.
 */

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  setFromUrlSearchParams,
  useQuizFiltersStore,
} from '@/features/quizzes/store/use-quiz-filters-store'
import { serializeQuizFilterUrl } from '@/features/quizzes/types/quiz-filter-params'
import type { QuizFilterUrlState } from '@/features/quizzes/types/quiz-filter-params'

const URL_SYNC_DEBOUNCE_MS = 300

export function useQuizFiltersUrlSync(): void {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track the in-flight debounce timer so the cleanup can cancel it.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Snapshot the initial URL params once on mount — the seed.
  // We use a ref to ensure the seed runs exactly once per mount and
  // does not re-fire on `searchParams` changes (which would happen
  // on every `router.replace`).
  const seededRef = useRef(false)

  // Phase 1: mount → seed the store from the URL.
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    setFromUrlSearchParams(new URLSearchParams(searchParams.toString()))
  }, [searchParams])

  // Phase 2: every store state change → debounced URL write.
  useEffect(() => {
    // Subscribe to the store's state. The seed on mount above may
    // mutate the store, but that mutation runs BEFORE this effect
    // subscribes (state changes always trigger a re-render, which
    // re-runs effects in declaration order). The first sync effect
    // will fire with the seeded state, but the URL is already
    // correct — the replacement is a no-op write.
    const unsubscribe = useQuizFiltersStore.subscribe((state) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        const params = serializeQuizFiltersToParams(state)
        const queryString = params.toString()
        const target = queryString.length > 0 ? `${pathname}?${queryString}` : pathname
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

// Local helper that wraps `getUrlSearchParams` so the subscribe
// closure is self-contained.
function serializeQuizFiltersToParams(state: QuizFilterUrlState) {
  return serializeQuizFilterUrl(state)
}