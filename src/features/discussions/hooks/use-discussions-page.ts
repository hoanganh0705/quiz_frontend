'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  discussions as mockDiscussions
} from '@/features/discussions/constants/discussion'
import {
  getDiscussions,
  type Discussion,
  type GetDiscussionsParams
} from '@/features/discussions/api/discussions'

export function useDiscussionsPage() {
  const [activeTab, setActiveTab] = useState<'recent' | 'popular' | 'your'>(
    'recent'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<
    'all' | 'Medium' | 'Hard'
  >('all')
  const [sortByComments, setSortByComments] = useState(false)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch discussions from API
  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        const params: GetDiscussionsParams = {}
        if (difficultyFilter !== 'all') {
          params.difficulty = difficultyFilter
        }

        const data = await getDiscussions(params)
        setDiscussions(data.discussions)
      } catch {
        // Use mock data if API fails
        setDiscussions(mockDiscussions as unknown as Discussion[])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDiscussions()
  }, [difficultyFilter])

  const filteredDiscussions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    let result = discussions.filter((discussion) => {
      const matchesSearch =
        query.length === 0 ||
        discussion.title.toLowerCase().includes(query) ||
        discussion.category.toLowerCase().includes(query) ||
        discussion.user.username.toLowerCase().includes(query)

      const matchesDifficulty =
        difficultyFilter === 'all' || discussion.difficulty === difficultyFilter

      return matchesSearch && matchesDifficulty
    })

    if (sortByComments) {
      result = [...result].sort((a, b) => b.comments - a.comments)
    }

    return result
  }, [searchQuery, difficultyFilter, sortByComments, discussions])

  const popularDiscussions = useMemo(
    () => [...filteredDiscussions].sort((a, b) => b.comments - a.comments),
    [filteredDiscussions]
  )

  const yourDiscussions = useMemo(
    () =>
      filteredDiscussions.filter(
        (discussion) => discussion.user.username.toLowerCase() === 'marvelfan'
      ),
    [filteredDiscussions]
  )

  const cycleDifficultyFilter = () => {
    setDifficultyFilter((prev) => {
      if (prev === 'all') return 'Medium'
      if (prev === 'Medium') return 'Hard'
      return 'all'
    })
  }

  const toggleSort = () => setSortByComments((prev) => !prev)

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    difficultyFilter,
    sortByComments,
    cycleDifficultyFilter,
    toggleSort,
    filteredDiscussions,
    popularDiscussions,
    yourDiscussions,
    isLoading
  }
}
