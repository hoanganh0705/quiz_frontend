'use client'

import { useState, useMemo, useCallback } from 'react'
import { tournaments } from '@/constants/tournament'

const TOURNAMENT_NOW = new Date('2025-08-01')

export function useTournamentPage() {
  const [filter, setFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const uniqueCategories = useMemo(
    () => ['all', ...new Set(tournaments.map((tournament) => tournament.category))],
    []
  )

  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments]

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (tournament) => tournament.category === selectedCategory
      )
    }

    switch (filter) {
      case 'upcoming':
        return filtered.filter(
          (tournament) => new Date(tournament.startDate) > TOURNAMENT_NOW
        )
      case 'ongoing':
        return filtered.filter(
          (tournament) =>
            new Date(tournament.startDate) <= TOURNAMENT_NOW &&
            new Date(tournament.endDate) >= TOURNAMENT_NOW
        )
      case 'completed':
        return filtered.filter(
          (tournament) => new Date(tournament.endDate) < TOURNAMENT_NOW
        )
      case 'registration':
        return filtered.filter((tournament) => tournament.registrationOpen)
      default:
        return filtered
    }
  }, [filter, selectedCategory])

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value)
  }, [])

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value)
  }, [])

  return {
    filter,
    selectedCategory,
    uniqueCategories,
    filteredTournaments,
    handleFilterChange,
    handleCategoryChange
  }
}
