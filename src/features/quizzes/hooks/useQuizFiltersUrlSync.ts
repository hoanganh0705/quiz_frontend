'use client'

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

const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const seededRef = useRef(false)

useEffect(() => {
if (seededRef.current) return
seededRef.current = true
setFromUrlSearchParams(new URLSearchParams(searchParams.toString()))
  }, [searchParams])

useEffect(() => {

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

function serializeQuizFiltersToParams(state: QuizFilterUrlState) {
return serializeQuizFilterUrl(state)
}