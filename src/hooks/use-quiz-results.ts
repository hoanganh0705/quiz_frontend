import { useLocalStorage } from './use-local-storage'

/**
 * Hook for managing quiz results in localStorage
 * @param quizId - The quiz identifier
 * @returns Results management utilities
 */
export function useQuizResults<T>(quizId: string, initialResults: T | null) {
  const storageKey = `quiz_results_${quizId}`
  const [results, setResults, clearResults] = useLocalStorage<T | null>(
    storageKey,
    initialResults
  )

  return {
    results,
    setResults,
    clearResults
  }
}
